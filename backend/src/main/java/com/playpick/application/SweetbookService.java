package com.playpick.application;

import com.playpick.config.AppProperties;
import com.playpick.config.SweetbookProperties;
import com.playpick.infrastructure.sweetbook.SweetbookClient;
import java.math.BigDecimal;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SweetbookService {

	private static final Logger log = LoggerFactory.getLogger(SweetbookService.class);
	private static final int DEFAULT_TOTAL_PAGE_COUNT = 24;
	private static final int DEFAULT_PAGE_INCREMENT = 2;
	private static final int MAX_GALLERY_IMAGES_PER_LAYOUT = 4;
	private static final int MAX_SELECTED_CURATED_IMAGES = 40;
	private static final DateTimeFormatter SWEETBOOK_DATE_RANGE_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd");
	private static final DateTimeFormatter SWEETBOOK_PUBLISH_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd");

	private final SweetbookClient sweetbookClient;
	private final SweetbookProperties sweetbookProperties;
	private final AppProperties appProperties;
	private final PublicAssetPublishingService publicAssetPublishingService;

	public boolean isLiveEnabled() {
		return sweetbookProperties.isLiveEnabled();
	}

	public SweetbookViews.IntegrationStatus getIntegrationStatus() {
		String mode = sweetbookProperties.integrationMode();
		String label = switch (mode) {
			case "LIVE" -> "실운영";
			case "SANDBOX" -> "샌드박스";
			default -> "시뮬레이션";
		};
		return new SweetbookViews.IntegrationStatus(mode, isLiveEnabled(), label);
	}

	@Cacheable("sweetbook-book-specs")
	public List<SweetbookViews.BookSpec> getBookSpecs() {
		if (!isLiveEnabled()) {
			return defaultBookSpecs();
		}
		return sweetbookClient.getBookSpecs();
	}

	@Cacheable(cacheNames = "sweetbook-templates", key = "#bookSpecUid")
	public List<SweetbookViews.Template> getTemplates(String bookSpecUid) {
		if (!isLiveEnabled()) {
			return defaultTemplates();
		}
		return sweetbookClient.getTemplates(bookSpecUid);
	}

	@Cacheable(cacheNames = "sweetbook-template-detail", key = "#templateUid")
	public SweetbookViews.TemplateDetail getTemplateDetail(String templateUid) {
		if (templateUid == null || templateUid.isBlank()) {
			return defaultTemplateDetail("");
		}
		if (!isLiveEnabled()) {
			return defaultTemplateDetail(templateUid);
		}
		try {
			SweetbookViews.TemplateDetail detail = sweetbookClient.getTemplateDetail(templateUid);
			if (detail.uid() == null || detail.uid().isBlank()) {
				return defaultTemplateDetail(templateUid);
			}
			return detail;
		} catch (RuntimeException exception) {
			log.warn("Sweetbook live template detail lookup failed.", exception);
			return defaultTemplateDetail(templateUid);
		}
	}

	public SweetbookViews.TemplateDetail getContentTemplateDetail(ProjectViews.Preview preview) {
		ResolvedTemplates resolvedTemplates = resolveTemplatesForPreview(preview);
		return getTemplateDetail(resolvedTemplates.contentTemplate().uid());
	}

	public ProjectViews.BookGeneration prepareBookDraft(
		ProjectViews.Preview preview,
		String externalRef,
		String idempotencyKey,
		boolean reused
	) {
		ResolvedTemplates resolvedTemplates = resolveTemplatesForPreview(preview);
		PagePlan pagePlan = planPages(
			resolveBookSpec(preview.edition().snapshot().bookSpecUid()),
			desiredTotalPagesForPreview(preview)
		);

		if (!isLiveEnabled()) {
			return buildDemoBookGeneration(preview, resolvedTemplates, pagePlan, "DRAFT", "BOOK_CREATED", reused, null);
		}

		Map<String, String> liveAssetUrlCache = new LinkedHashMap<>();
		List<BookContentPage> contentPages;
		LiveDraftAssets liveDraftAssets;
		try {
			contentPages = buildSweetbookContentPages(
				preview,
				pagePlan.contentPages(),
				liveAssetUrlCache
			);
			liveDraftAssets = prepareLiveDraftAssets(preview, contentPages, liveAssetUrlCache);
		} catch (AppException exception) {
			if (shouldFallbackToDemoDraft(exception)) {
				log.info("Falling back to simulated Sweetbook draft because live assets are not publicly reachable.");
				return buildDemoBookGeneration(preview, resolvedTemplates, pagePlan, "DRAFT", "BOOK_CREATED", reused, null);
			}
			throw exception;
		}

		try {
			Map<String, Object> createPayload = new LinkedHashMap<>();
			createPayload.put("bookSpecUid", preview.edition().snapshot().bookSpecUid());
			createPayload.put("title", preview.edition().title());
			createPayload.put("subtitle", preview.edition().subtitle());
			if (externalRef != null && !externalRef.isBlank()) {
				createPayload.put("externalRef", externalRef);
			}
			createPayload.put("metadata", Map.of(
				"projectId", preview.projectId(),
				"fanNickname", preview.personalizationData().getOrDefault("fanNickname", "팬")
			));

			String bookUid = sweetbookClient.createBook(createPayload, idempotencyKey);
			addDraftContents(preview, resolvedTemplates, pagePlan, bookUid, liveDraftAssets, contentPages);

			return new ProjectViews.BookGeneration(
				preview.projectId(),
				bookUid,
				"DRAFT",
				"BOOK_CREATED",
				preview.edition().snapshot().bookSpecUid(),
				resolvedTemplates.coverTemplate().uid(),
				resolvedTemplates.publishTemplate().uid(),
				resolvedTemplates.contentTemplate().uid(),
				pagePlan.totalPages(),
				false,
				reused
			);
		} catch (RuntimeException exception) {
			log.warn("Sweetbook live draft generation failed.", exception);
			throw liveFailure("draft generation", exception);
		}
	}

	public ProjectViews.BookGeneration finalizeBook(
		ProjectViews.Preview preview,
		String bookUid,
		boolean reused
	) {
		ResolvedTemplates resolvedTemplates = resolveTemplatesForPreview(preview);
		PagePlan pagePlan = planPages(
			resolveBookSpec(preview.edition().snapshot().bookSpecUid()),
			desiredTotalPagesForPreview(preview)
		);

		if (!isLiveEnabled() || isSimulatedBookUid(bookUid)) {
			return buildDemoBookGeneration(preview, resolvedTemplates, pagePlan, "FINALIZED", "FINALIZED", reused, bookUid);
		}

		try {
			sweetbookClient.finalizeBook(bookUid);
			return new ProjectViews.BookGeneration(
				preview.projectId(),
				bookUid,
				"FINALIZED",
				"FINALIZED",
				preview.edition().snapshot().bookSpecUid(),
				resolvedTemplates.coverTemplate().uid(),
				resolvedTemplates.publishTemplate().uid(),
				resolvedTemplates.contentTemplate().uid(),
				pagePlan.totalPages(),
				false,
				reused
			);
		} catch (RuntimeException exception) {
			log.warn("Sweetbook live finalization failed.", exception);
			throw liveFailure("finalization", exception);
		}
	}

	public ProjectViews.BookGeneration describeBook(
		ProjectViews.Preview preview,
		String bookUid,
		String sweetbookStatus,
		String projectStatus,
		boolean simulated,
		boolean reused
	) {
		ResolvedTemplates resolvedTemplates = resolveTemplatesForPreview(preview);
		PagePlan pagePlan = planPages(
			resolveBookSpec(preview.edition().snapshot().bookSpecUid()),
			desiredTotalPagesForPreview(preview)
		);
		return new ProjectViews.BookGeneration(
			preview.projectId(),
			bookUid,
			sweetbookStatus,
			projectStatus,
			preview.edition().snapshot().bookSpecUid(),
			resolvedTemplates.coverTemplate().uid(),
			resolvedTemplates.publishTemplate().uid(),
			resolvedTemplates.contentTemplate().uid(),
			pagePlan.totalPages(),
			simulated,
			reused
		);
	}

	public ProjectViews.Estimate estimateOrder(Long projectId, String bookUid, ProjectCommands.Shipping shipping) {
		if (!isLiveEnabled() || isSimulatedBookUid(bookUid)) {
			return buildDemoEstimate(projectId, "Sweetbook API key not configured, returning demo estimate");
		}

		try {
			Map<String, Object> payload = buildOrderPayload(bookUid, normalizeShipping(shipping));
			Map<String, Object> result = sweetbookClient.estimateOrder(payload);
			BigDecimal vendorCost = asBigDecimal(result.get("totalAmount"), BigDecimal.ZERO);
			return new ProjectViews.Estimate(
				projectId,
				asString(result.get("currency"), "KRW"),
				vendorCost,
				vendorCost,
				asBigDecimal(result.get("shippingFee"), BigDecimal.ZERO),
				BigDecimal.ZERO,
				BigDecimal.ZERO,
				BigDecimal.ZERO,
				false,
				result
			);
		} catch (RuntimeException exception) {
			log.warn("Sweetbook live estimate failed.", exception);
			throw liveFailure("estimate lookup", exception);
		}
	}

	public ProjectViews.FulfillmentResult createOrder(Long projectId, String bookUid, ProjectCommands.Shipping shipping) {
		if (!isLiveEnabled() || isSimulatedBookUid(bookUid)) {
			return buildDemoOrder(projectId, "Sweetbook API key not configured, returning demo order");
		}

		try {
			Map<String, Object> payload = buildOrderPayload(bookUid, normalizeShipping(shipping));
			Map<String, Object> result = sweetbookClient.createOrder(payload, UUID.randomUUID().toString());
			return new ProjectViews.FulfillmentResult(
				projectId,
				asString(result.get("orderUid"), ""),
				normalizeOrderStatus(result),
				asBigDecimal(result.get("totalAmount"), BigDecimal.ZERO),
				false,
				result
			);
		} catch (RuntimeException exception) {
			log.warn("Sweetbook live order creation failed.", exception);
			throw liveFailure("order creation", exception);
		}
	}

	private void addDraftContents(
		ProjectViews.Preview preview,
		ResolvedTemplates resolvedTemplates,
		PagePlan pagePlan,
		String bookUid,
		LiveDraftAssets liveDraftAssets,
		List<BookContentPage> contentPages
	) {
		LocalDate today = LocalDate.now();
		String fanNickname = String.valueOf(preview.personalizationData().getOrDefault("fanNickname", "팬"));

		Map<String, Object> coverParams = buildMixedCoverParams(
			preview,
			liveDraftAssets.coverImageUrl(),
			liveDraftAssets.backCoverImageUrl(),
			today
		);
		sweetbookClient.addCover(bookUid, resolvedTemplates.coverTemplate().uid(), coverParams);

		List<LiveContentInstruction> instructions = buildLiveContentInstructions(
			contentPages,
			resolvedTemplates,
			fanNickname,
			preview.edition().title(),
			today,
			pagePlan.contentPages()
		);
		for (LiveContentInstruction instruction : instructions) {
			sweetbookClient.addContents(
				bookUid,
				instruction.template().uid(),
				instruction.params(),
				instruction.breakBefore()
			);
		}

		Map<String, Object> publishParams = buildMixedPublishParams(preview, today);
		sweetbookClient.addContents(bookUid, resolvedTemplates.publishTemplate().uid(), publishParams, "page");
	}

	private LiveDraftAssets prepareLiveDraftAssets(
		ProjectViews.Preview preview,
		List<BookContentPage> contentPages,
		Map<String, String> liveAssetUrlCache
	) {
		String coverImageUrl = toLiveAssetUrl(preview.edition().coverImageUrl(), "커버 이미지", liveAssetUrlCache);
		String backCoverImageUrl = toLiveAssetUrl(
			fallbackImage(readBackCoverImage(contentPages, preview), preview.edition().coverImageUrl()),
			"뒷표지 이미지",
			liveAssetUrlCache
		);
		return new LiveDraftAssets(coverImageUrl, backCoverImageUrl);
	}

	private ResolvedTemplates resolveTemplatesForPreview(ProjectViews.Preview preview) {
		List<SweetbookViews.Template> templates = resolveTemplates(preview.edition().snapshot().bookSpecUid());
		return new ResolvedTemplates(
			chooseCoverTemplate(templates, sweetbookProperties.getDefaultCoverTemplateUid()),
			choosePublishTemplate(templates, sweetbookProperties.getDefaultPublishTemplateUid()),
			chooseContentTemplate(templates, sweetbookProperties.getDefaultContentTemplateUid()),
			chooseOptionalTemplate(templates, sweetbookProperties.getDefaultContentTextTemplateUid()),
			chooseOptionalTemplate(templates, sweetbookProperties.getDefaultContentGalleryTemplateUid()),
			chooseTemplate(
				templates,
				sweetbookProperties.getDefaultDividerTemplateUid(),
				"divider",
				""
			),
			chooseOptionalTemplate(templates, sweetbookProperties.getDefaultBlankTemplateUid())
		);
	}

	private List<SweetbookViews.Template> resolveTemplates(String bookSpecUid) {
		if (!isLiveEnabled()) {
			return getTemplates(bookSpecUid);
		}

		try {
			return getTemplates(bookSpecUid);
		} catch (RuntimeException exception) {
			log.warn("Sweetbook live template lookup failed.", exception);
			throw liveFailure("template lookup", exception);
		}
	}

	private AppException liveFailure(String operation, RuntimeException exception) {
		return new AppException(
			HttpStatus.BAD_GATEWAY,
			"Sweetbook " + operation + " failed while live integration is enabled",
			exception
		);
	}

	private List<SweetbookViews.BookSpec> defaultBookSpecs() {
		return List.of(new SweetbookViews.BookSpec(
			sweetbookProperties.getDefaultBookSpecUid(),
			"Squarebook Hardcover",
			24,
			130,
			2
		));
	}

	private List<SweetbookViews.Template> defaultTemplates() {
		return List.of(
			new SweetbookViews.Template(
				sweetbookProperties.getDefaultCoverTemplateUid(),
				"일기장B 표지",
				"일기장B",
				"cover",
				"https://picsum.photos/seed/demo-cover-template/960/720"
			),
			new SweetbookViews.Template(
				sweetbookProperties.getDefaultPublishTemplateUid(),
				"일기장B 발행면",
				"일기장B",
				"publish",
				"https://picsum.photos/seed/demo-publish-template/960/720"
			),
			new SweetbookViews.Template(
				sweetbookProperties.getDefaultContentTemplateUid(),
				"일기장B 내지a contain",
				"album",
				"content",
				"https://picsum.photos/seed/demo-content-template/960/720"
			),
			new SweetbookViews.Template(
				sweetbookProperties.getDefaultContentTextTemplateUid(),
				"일기장B 내지b",
				"album",
				"content",
				"https://picsum.photos/seed/demo-content-text-template/960/720"
			),
			new SweetbookViews.Template(
				sweetbookProperties.getDefaultContentGalleryTemplateUid(),
				"일기장B 내지_gallery",
				"album",
				"content",
				"https://picsum.photos/seed/demo-content-gallery-template/960/720"
			),
			new SweetbookViews.Template(
				sweetbookProperties.getDefaultBlankTemplateUid(),
				"빈내지",
				"공용",
				"content",
				"https://picsum.photos/seed/demo-blank-template/960/720"
			)
		);
	}

	private SweetbookViews.TemplateDetail defaultTemplateDetail(String templateUid) {
		if ("3FhSEhJ94c0T".equals(templateUid) || sweetbookProperties.getDefaultContentTemplateUid().equals(templateUid)) {
			return defaultDiaryBTemplateDetail();
		}
		return new SweetbookViews.TemplateDetail(
			templateUid,
			"",
			"",
			"content",
			"",
			"",
			Map.of(),
			Map.of(),
			Map.of(),
			Map.of()
		);
	}

	private SweetbookViews.TemplateDetail defaultDiaryBTemplateDetail() {
		Map<String, Object> parameters = Map.of(
			"definitions", Map.ofEntries(
				Map.entry("date", Map.of("binding", "text", "type", "string", "required", true)),
				Map.entry("title", Map.of("binding", "text", "type", "string", "required", false)),
				Map.entry("diaryText", Map.of("binding", "text", "type", "string", "required", true)),
				Map.entry("photo1", Map.of("binding", "file", "type", "image", "required", true))
			)
		);
		Map<String, Object> layout = Map.of(
			"width", 1956.0,
			"height", 1000.8,
			"backgroundColor", "#00FFFFFF",
			"elements", List.of(
				Map.of("element_id", "date", "type", "text", "position", Map.of("x", 84.0, "y", 76.0), "width", 220.0, "height", 30.0),
				Map.of("element_id", "title", "type", "text", "position", Map.of("x", 84.0, "y", 126.0), "width", 420.0, "height", 48.0),
				Map.of("element_id", "photo1", "type", "image", "position", Map.of("x", 620.0, "y", 84.0), "width", 580.0, "height", 700.0),
				Map.of("element_id", "photo2", "type", "image", "position", Map.of("x", 1240.0, "y", 420.0), "width", 460.0, "height", 364.0)
			)
		);
		Map<String, Object> layoutRules = Map.of(
			"flow", Map.of("columns", 1, "itemSpacing", Map.of("size", 18)),
			"margin", Map.of("pageMargin", Map.of("spine", 64, "fore", 64, "head", 72, "tail", 72))
		);
		Map<String, Object> baseLayer = Map.of(
			"odd", Map.of(
				"elements", List.of(
					Map.of("element_id", "bl-odd-bg", "type", "rectangle", "color", "#FFF7F1EA")
				)
			),
			"even", Map.of(
				"elements", List.of(
					Map.of("element_id", "bl-even-bg", "type", "rectangle", "color", "#FFFCF8F2")
				)
			)
		);
		return new SweetbookViews.TemplateDetail(
			sweetbookProperties.getDefaultContentTemplateUid(),
			"사진+글 내지",
			"",
			"content",
			"일기장B",
			"https://api-sandbox.sweetbook.com/templates_thumb/3FhSEhJ94c0T/layout.jpg",
			parameters,
			layout,
			layoutRules,
			baseLayer
		);
	}

	private SweetbookViews.BookSpec resolveBookSpec(String bookSpecUid) {
		return getBookSpecs().stream()
			.filter(spec -> spec.uid().equals(bookSpecUid))
			.findFirst()
			.orElse(new SweetbookViews.BookSpec(bookSpecUid, bookSpecUid, 24, 130, 2));
	}

	private PagePlan planPages(SweetbookViews.BookSpec bookSpec, int desiredTotalPages) {
		int minimumPages = positive(bookSpec.minPages(), DEFAULT_TOTAL_PAGE_COUNT);
		int maximumPages = Math.max(minimumPages, positive(bookSpec.maxPages(), minimumPages));
		int pageIncrement = positive(bookSpec.pageIncrement(), DEFAULT_PAGE_INCREMENT);

		int totalPages = Math.max(minimumPages, desiredTotalPages);
		if ((totalPages - minimumPages) % pageIncrement != 0) {
			int remainder = (totalPages - minimumPages) % pageIncrement;
			totalPages += pageIncrement - remainder;
		}
		totalPages = Math.min(Math.max(totalPages, minimumPages), maximumPages);

		int publishPages = 1;
		int contentPages = Math.max(1, totalPages - publishPages);
		return new PagePlan(totalPages, publishPages, contentPages, minimumPages, maximumPages, pageIncrement);
	}

	private int positive(Integer value, int fallback) {
		if (value == null || value <= 0) {
			return fallback;
		}
		return value;
	}

	private int desiredTotalPagesForPreview(ProjectViews.Preview preview) {
		return DEFAULT_TOTAL_PAGE_COUNT;
	}

	private int estimateRequiredContentPages(ProjectViews.Preview preview) {
		int narrativePageCount = selectNarrativePages(preview).size();
		int imageCount = countCuratedImages(preview);
		int groupedImagePages = requiredGalleryPageCount(imageCount);
		return Math.max(1, narrativePageCount + groupedImagePages);
	}

	private int countCuratedImages(ProjectViews.Preview preview) {
		return collectCuratedImageUrls(preview, null).size();
	}

	private List<BookContentPage> buildSweetbookContentPages(
		ProjectViews.Preview preview,
		int contentPageCount,
		Map<String, String> liveAssetUrlCache
	) {
		List<String> curatedImageUrls = collectCuratedImageUrls(preview, liveAssetUrlCache);
		List<ProjectViews.Page> narrativePages = selectNarrativePages(preview);

		List<List<String>> imageGroups = groupCuratedImages(
			curatedImageUrls,
			Math.max(contentPageCount - narrativePages.size(), 1)
		);
		if (narrativePages.isEmpty() && imageGroups.isEmpty()) {
			return List.of();
		}

		List<BookContentPage> result = new ArrayList<>();
		int groupsPerNarrative = narrativePages.isEmpty()
			? imageGroups.size()
			: Math.max(1, (int) Math.ceil(imageGroups.size() / (double) narrativePages.size()));
		int imageGroupIndex = 0;

		for (ProjectViews.Page page : narrativePages) {
			result.add(BookContentPage.narrative(
				page.key(),
				page.title(),
				page.description(),
				toOptionalLiveAssetUrl(page.imageUrl(), "내지 이미지 " + page.key(), liveAssetUrlCache)
			));
			for (int count = 0; count < groupsPerNarrative && imageGroupIndex < imageGroups.size(); count++) {
				result.add(buildGalleryPage(imageGroups.get(imageGroupIndex), imageGroupIndex));
				imageGroupIndex++;
			}
		}

		while (imageGroupIndex < imageGroups.size()) {
			result.add(buildGalleryPage(imageGroups.get(imageGroupIndex), imageGroupIndex));
			imageGroupIndex++;
		}

		int maxNotebookEntries = Math.max(contentPageCount * 2, contentPageCount);
		if (result.size() > maxNotebookEntries) {
			return result.subList(0, maxNotebookEntries);
		}
		return result;
	}

	private List<LiveContentInstruction> buildLiveContentInstructions(
		List<BookContentPage> sourcePages,
		ResolvedTemplates resolvedTemplates,
		String fanNickname,
		String bookTitle,
		LocalDate today,
		int contentPageCount
	) {
		List<LiveContentInstruction> instructions = new ArrayList<>();
		int consumedPhysicalPages = 0;

		for (int index = 0; index < sourcePages.size(); index++) {
			BookContentPage page = sourcePages.get(index);
			SweetbookViews.Template template = selectContentTemplate(page, resolvedTemplates);
			instructions.add(new LiveContentInstruction(
				template,
				buildMixedContentParams(page, fanNickname, bookTitle, today, index),
				"page"
			));
			consumedPhysicalPages++;
		}

		while (consumedPhysicalPages < contentPageCount && resolvedTemplates.blankTemplate() != null
			&& resolvedTemplates.blankTemplate().uid() != null
			&& !resolvedTemplates.blankTemplate().uid().isBlank()) {
			LocalDate blankDate = today.plusDays(consumedPhysicalPages);
			instructions.add(new LiveContentInstruction(
				resolvedTemplates.blankTemplate(),
				buildBlankPageParams(bookTitle, blankDate),
				"page"
			));
			consumedPhysicalPages++;
		}
		return instructions;
	}

	private SweetbookViews.Template selectContentTemplate(
		BookContentPage page,
		ResolvedTemplates resolvedTemplates
	) {
		if (page.gallery() && resolvedTemplates.galleryTemplate() != null) {
			return resolvedTemplates.galleryTemplate();
		}
		if ((page.primaryImageUrl() == null || page.primaryImageUrl().isBlank())
			&& resolvedTemplates.textContentTemplate() != null) {
			return resolvedTemplates.textContentTemplate();
		}
		return resolvedTemplates.contentTemplate();
	}

	private int requiredGalleryPageCount(int imageCount) {
		if (imageCount <= 0) {
			return 0;
		}
		return (int) Math.ceil(imageCount / (double) MAX_GALLERY_IMAGES_PER_LAYOUT);
	}

	private Map<String, Object> buildMixedContentParams(
		BookContentPage page,
		String fanNickname,
		String bookTitle,
		LocalDate today,
		int index
	) {
		if (page.gallery()) {
			return buildMixedGalleryParams(page, today.plusDays(index));
		}
		if (page.primaryImageUrl() == null || page.primaryImageUrl().isBlank()) {
			return buildMixedTextStoryParams(page, today.plusDays(index));
		}
		return buildMixedPhotoStoryParams(page, fanNickname, today.plusDays(index));
	}

	private Map<String, Object> buildMixedPhotoStoryParams(
		BookContentPage page,
		String fanNickname,
		LocalDate pageDate
	) {
		Map<String, Object> params = new LinkedHashMap<>();
		putMixedDiaryDateParams(params, pageDate);
		params.put("title", truncate(page.title(), 48));
		params.put("diaryText", buildDiaryStoryText(page, fanNickname));
		params.put("photo1", page.primaryImageUrl());
		params.put("photo2", page.imageUrls().size() > 1 ? page.imageUrls().get(1) : "");
		return params;
	}

	private Map<String, Object> buildMixedTextStoryParams(BookContentPage page, LocalDate pageDate) {
		Map<String, Object> params = new LinkedHashMap<>();
		putMixedDiaryDateParams(params, pageDate);
		params.put("title", truncate(page.title(), 48));
		params.put("diaryText", truncate(fallback(page.description(), page.title()), 700));
		return params;
	}

	private Map<String, Object> buildMixedGalleryParams(BookContentPage page, LocalDate pageDate) {
		Map<String, Object> params = new LinkedHashMap<>();
		List<String> galleryPhotos = page.imageUrls().stream().limit(MAX_GALLERY_IMAGES_PER_LAYOUT).toList();
		putMixedDiaryDateParams(params, pageDate);
		params.put("photos", galleryPhotos);
		params.put("collagePhotos", galleryPhotos);
		return params;
	}

	private void putMixedDiaryDateParams(Map<String, Object> params, LocalDate pageDate) {
		params.put("year", String.valueOf(pageDate.getYear()));
		params.put("month", String.valueOf(pageDate.getMonthValue()));
		params.put("day", String.valueOf(pageDate.getDayOfMonth()));
		params.put("monthNum", String.format("%02d", pageDate.getMonthValue()));
		params.put("dayNum", String.format("%02d", pageDate.getDayOfMonth()));
		String formattedDate = formatMixedDiaryDate(pageDate);
		params.put("date", formattedDate);
		params.put("dateB", formattedDate);
	}

	private String buildDiaryStoryText(BookContentPage page, String fanNickname) {
		String description = fallback(page.description(), "PlayPick 굿즈 페이지");
		String text = page.title() + "\n\n" + description + "\n\n" + fanNickname + "님을 위해 고른 장면을 한 페이지로 정리했어요.";
		return truncate(text, 700);
	}

	private String formatMixedDiaryDate(LocalDate date) {
		return date.getMonthValue() + "." + String.format("%02d", date.getDayOfMonth());
	}

	private Map<String, Object> buildMixedCoverParams(
		ProjectViews.Preview preview,
		String coverImageUrl,
		String backCoverImageUrl,
		LocalDate today
	) {
		String fanNickname = asString(preview.personalizationData().get("fanNickname"), "팬");
		String subscribedSince = asString(preview.personalizationData().get("subscribedSince"), "");
		Map<String, Object> params = new LinkedHashMap<>();
		params.put("frontPhoto", coverImageUrl);
		params.put("backPhoto", backCoverImageUrl);
		params.put("spineTitle", truncate(fanNickname + " Diary Book", 40));
		params.put("dateRange", formatCoverPeriodText(subscribedSince, today));
		return params;
	}

	private String formatCoverPeriodText(String subscribedSince, LocalDate today) {
		if (subscribedSince != null && !subscribedSince.isBlank() && subscribedSince.length() >= 10) {
			LocalDate start = LocalDate.parse(subscribedSince.substring(0, 10));
			return SWEETBOOK_DATE_RANGE_FORMAT.format(start) + " -\n" + SWEETBOOK_DATE_RANGE_FORMAT.format(today);
		}
		return SWEETBOOK_DATE_RANGE_FORMAT.format(today);
	}

	private Map<String, Object> buildMixedPublishParams(ProjectViews.Preview preview, LocalDate today) {
		Map<String, Object> params = new LinkedHashMap<>();
		params.put("title", preview.edition().title());
		params.put("publishDate", SWEETBOOK_PUBLISH_DATE_FORMAT.format(today));
		params.put("author", preview.edition().creator().displayName());
		params.put("hashtags", "#PlayPick #Sweetbook #CreatorArchive");
		return params;
	}

	private Map<String, Object> buildBlankPageParams(String bookTitle, LocalDate pageDate) {
		Map<String, Object> params = new LinkedHashMap<>();
		params.put("bookTitle", truncate(bookTitle, 40));
		params.put("year", String.valueOf(pageDate.getYear()));
		params.put("month", String.valueOf(pageDate.getMonthValue()));
		return params;
	}

	private List<ProjectViews.Page> selectNarrativePages(ProjectViews.Preview preview) {
		List<String> preferredOrder = List.of(
			"official-intro",
			"relationship",
			"fan-pick",
			"fan-note",
			"official-closing"
		);
		Map<String, ProjectViews.Page> pageByKey = new LinkedHashMap<>();
		for (ProjectViews.Page page : preview.pages()) {
			pageByKey.put(page.key(), page);
		}
		List<ProjectViews.Page> result = new ArrayList<>();
		for (String key : preferredOrder) {
			ProjectViews.Page page = pageByKey.get(key);
			if (page != null) {
				result.add(page);
			}
		}
		return result;
	}

	private List<String> collectCuratedImageUrls(ProjectViews.Preview preview, Map<String, String> liveAssetUrlCache) {
		List<EditionViews.CuratedAsset> assets = preview.edition().snapshot().curatedAssets();
		if (assets == null || assets.isEmpty()) {
			return List.of();
		}

		List<String> imageUrls = new ArrayList<>();
		for (EditionViews.CuratedAsset asset : assets) {
			if (!"IMAGE".equals(asset.assetType())) {
				continue;
			}
			imageUrls.add(toLiveAssetUrl(asset.content(), "큐레이션 이미지 " + asset.title(), liveAssetUrlCache));
		}
		return selectRepresentativeImages(imageUrls, MAX_SELECTED_CURATED_IMAGES);
	}

	private List<String> selectRepresentativeImages(List<String> imageUrls, int limit) {
		if (imageUrls.size() <= limit) {
			return imageUrls;
		}

		List<String> selected = new ArrayList<>(limit);
		double maxIndex = imageUrls.size() - 1;
		for (int index = 0; index < limit; index++) {
			int sampledIndex = (int) Math.round(index * maxIndex / (limit - 1));
			String candidate = imageUrls.get(sampledIndex);
			if (!selected.contains(candidate)) {
				selected.add(candidate);
			}
		}

		if (selected.size() < limit) {
			for (String imageUrl : imageUrls) {
				if (selected.contains(imageUrl)) {
					continue;
				}
				selected.add(imageUrl);
				if (selected.size() == limit) {
					break;
				}
			}
		}
		return List.copyOf(selected);
	}

	private List<List<String>> groupCuratedImages(
		List<String> imageUrls,
		int targetGroupCount
	) {
		if (imageUrls.isEmpty()) {
			return List.of();
		}

		int minimumRequiredGroupCount = requiredGalleryPageCount(imageUrls.size());
		int safeGroupCount = Math.max(
			1,
			Math.min(
				imageUrls.size(),
				Math.max(minimumRequiredGroupCount, targetGroupCount <= 0 ? minimumRequiredGroupCount : Math.min(targetGroupCount, imageUrls.size()))
			)
		);
		int baseGroupSize = imageUrls.size() / safeGroupCount;
		int remainder = imageUrls.size() % safeGroupCount;
		List<List<String>> groups = new ArrayList<>();
		int cursor = 0;
		for (int index = 0; index < safeGroupCount; index++) {
			int groupSize = baseGroupSize + (index < remainder ? 1 : 0);
			int nextCursor = Math.min(cursor + groupSize, imageUrls.size());
			groups.add(imageUrls.subList(cursor, nextCursor));
			cursor = nextCursor;
		}
		return groups;
	}

	private BookContentPage buildGalleryPage(List<String> imageUrls, int index) {
		String chapterTitle = switch (index % 3) {
			case 0 -> "공식 컷 아카이브";
			case 1 -> "무드 컷 셀렉션";
			default -> "포토북 갤러리";
		};
		String description = imageUrls.size() + "개의 컷을 한 번에 묶어 리듬을 바꿔주는 갤러리 페이지입니다.";
		return BookContentPage.gallery(
			"gallery-" + (index + 1),
			chapterTitle,
			description,
			imageUrls
		);
	}

	private String readBackCoverImage(List<BookContentPage> contentPages, ProjectViews.Preview preview) {
		for (int index = contentPages.size() - 1; index >= 0; index--) {
			BookContentPage page = contentPages.get(index);
			if (page.primaryImageUrl() != null && !page.primaryImageUrl().isBlank()) {
				return page.primaryImageUrl();
			}
		}
		return preview.edition().coverImageUrl();
	}

	private ProjectViews.BookGeneration buildDemoBookGeneration(
		ProjectViews.Preview preview,
		ResolvedTemplates resolvedTemplates,
		PagePlan pagePlan,
		String sweetbookStatus,
		String projectStatus,
		boolean reused,
		String existingBookUid
	) {
		return new ProjectViews.BookGeneration(
			preview.projectId(),
			existingBookUid == null || existingBookUid.isBlank()
				? "demo-book-" + preview.projectId() + "-" + Instant.now().toEpochMilli()
				: existingBookUid,
			sweetbookStatus,
			projectStatus,
			preview.edition().snapshot().bookSpecUid(),
			resolvedTemplates.coverTemplate().uid(),
			resolvedTemplates.publishTemplate().uid(),
			resolvedTemplates.contentTemplate().uid(),
			pagePlan.totalPages(),
			true,
			reused
		);
	}

	private ProjectViews.Estimate buildDemoEstimate(Long projectId, String message) {
		BigDecimal vendorCost = BigDecimal.valueOf(18900);
		return new ProjectViews.Estimate(
			projectId,
			"KRW",
			vendorCost,
			vendorCost,
			BigDecimal.valueOf(3500),
			BigDecimal.ZERO,
			BigDecimal.ZERO,
			BigDecimal.ZERO,
			true,
			Map.of("message", message)
		);
	}

	private ProjectViews.FulfillmentResult buildDemoOrder(Long projectId, String message) {
		return new ProjectViews.FulfillmentResult(
			projectId,
			"demo-order-" + UUID.randomUUID(),
			"PAID",
			BigDecimal.valueOf(9900),
			true,
			Map.of("message", message)
		);
	}

	private Map<String, Object> buildOrderPayload(String bookUid, ProjectCommands.Shipping shipping) {
		Map<String, Object> shippingPayload = new LinkedHashMap<>();
		shippingPayload.put("recipientName", shipping.recipientName());
		shippingPayload.put("recipientPhone", shipping.recipientPhone());
		shippingPayload.put("postalCode", shipping.postalCode());
		shippingPayload.put("address1", shipping.address1());
		shippingPayload.put("address2", shipping.address2());

		Map<String, Object> lineItem = new LinkedHashMap<>();
		lineItem.put("bookUid", bookUid);
		lineItem.put("quantity", Math.max(shipping.quantity(), 1));

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("items", List.of(lineItem));
		payload.put("shipping", shippingPayload);
		return payload;
	}

	private ProjectCommands.Shipping normalizeShipping(ProjectCommands.Shipping shipping) {
		if (shipping != null) {
			return new ProjectCommands.Shipping(
				fallback(shipping.recipientName(), "플레이픽 팬"),
				fallback(shipping.recipientPhone(), "010-0000-0000"),
				fallback(shipping.postalCode(), "00000"),
				fallback(shipping.address1(), "데모 주소"),
				fallback(shipping.address2(), ""),
				Math.max(shipping.quantity(), 1)
			);
		}
		return new ProjectCommands.Shipping(
			"플레이픽 팬",
			"010-0000-0000",
			"00000",
			"데모 주소",
			"",
			1
		);
	}

	private SweetbookViews.Template chooseCoverTemplate(List<SweetbookViews.Template> templates, String preferredTemplateUid) {
		if (preferredTemplateUid != null && !preferredTemplateUid.isBlank()) {
			return templates.stream()
				.filter(template -> preferredTemplateUid.equals(template.uid()))
				.findFirst()
				.orElse(new SweetbookViews.Template(
					preferredTemplateUid,
					"Selected Cover Template",
					sweetbookProperties.getDefaultTemplateCategory(),
					"cover",
					""
				));
		}
		if (!sweetbookProperties.getDefaultCoverTemplateUid().isBlank()) {
			return templates.stream()
				.filter(template -> sweetbookProperties.getDefaultCoverTemplateUid().equals(template.uid()))
				.findFirst()
				.orElse(new SweetbookViews.Template(
					sweetbookProperties.getDefaultCoverTemplateUid(),
					"Configured Cover Template",
					sweetbookProperties.getDefaultTemplateCategory(),
					"cover",
					""
				));
		}
		return templates.stream()
			.filter(template -> template.role().toLowerCase().contains("cover"))
			.findFirst()
			.orElseGet(() -> templates.stream()
				.filter(template -> template.name().toLowerCase().contains("cover"))
				.findFirst()
				.orElse(templates.get(0)));
	}

	private SweetbookViews.Template choosePublishTemplate(List<SweetbookViews.Template> templates, String preferredTemplateUid) {
		if (preferredTemplateUid != null && !preferredTemplateUid.isBlank()) {
			return templates.stream()
				.filter(template -> preferredTemplateUid.equals(template.uid()))
				.findFirst()
				.orElse(new SweetbookViews.Template(
					preferredTemplateUid,
					"Selected Publish Template",
					sweetbookProperties.getDefaultTemplateCategory(),
					"publish",
					""
				));
		}
		if (!sweetbookProperties.getDefaultPublishTemplateUid().isBlank()) {
			return templates.stream()
				.filter(template -> sweetbookProperties.getDefaultPublishTemplateUid().equals(template.uid()))
				.findFirst()
				.orElse(new SweetbookViews.Template(
					sweetbookProperties.getDefaultPublishTemplateUid(),
					"Configured Publish Template",
					sweetbookProperties.getDefaultTemplateCategory(),
					"publish",
					""
				));
		}
		return templates.stream()
			.filter(template -> template.role().toLowerCase().contains("publish"))
			.findFirst()
			.orElse(templates.get(0));
	}

	private SweetbookViews.Template chooseContentTemplate(List<SweetbookViews.Template> templates, String preferredTemplateUid) {
		if (preferredTemplateUid != null && !preferredTemplateUid.isBlank()) {
			return templates.stream()
				.filter(template -> preferredTemplateUid.equals(template.uid()))
				.findFirst()
				.orElse(new SweetbookViews.Template(
					preferredTemplateUid,
					"Selected Content Template",
					sweetbookProperties.getDefaultTemplateCategory(),
					"content",
					""
				));
		}
		if (!sweetbookProperties.getDefaultContentTemplateUid().isBlank()) {
			return templates.stream()
				.filter(template -> sweetbookProperties.getDefaultContentTemplateUid().equals(template.uid()))
				.findFirst()
				.orElse(new SweetbookViews.Template(
					sweetbookProperties.getDefaultContentTemplateUid(),
					"Configured Content Template",
					sweetbookProperties.getDefaultTemplateCategory(),
					"content",
					""
				));
		}
		return templates.stream()
			.filter(template -> template.role().toLowerCase().contains("content"))
			.findFirst()
			.orElse(templates.get(0));
	}

	private SweetbookViews.Template chooseTemplate(
		List<SweetbookViews.Template> templates,
		String preferredTemplateUid,
		String role,
		String fallbackUid
	) {
		if (preferredTemplateUid != null && !preferredTemplateUid.isBlank()) {
			SweetbookViews.Template exact = templates.stream()
				.filter(template -> preferredTemplateUid.equals(template.uid()))
				.findFirst()
				.orElse(null);
			if (exact != null) {
				return exact;
			}
		}
		if (fallbackUid != null && !fallbackUid.isBlank()) {
			SweetbookViews.Template fallbackTemplate = templates.stream()
				.filter(template -> fallbackUid.equals(template.uid()))
				.findFirst()
				.orElse(null);
			if (fallbackTemplate != null) {
				return fallbackTemplate;
			}
		}
		return templates.stream()
			.filter(template -> template.role().toLowerCase().contains(role))
			.findFirst()
			.orElse(null);
	}

	private SweetbookViews.Template chooseOptionalTemplate(
		List<SweetbookViews.Template> templates,
		String preferredTemplateUid
	) {
		if (preferredTemplateUid == null || preferredTemplateUid.isBlank()) {
			return null;
		}
		return templates.stream()
			.filter(template -> preferredTemplateUid.equals(template.uid()))
			.findFirst()
			.orElse(null);
	}

	private String fallbackImage(String value, String fallback) {
		return value == null || value.isBlank() ? fallback : value;
	}

	private String toLiveAssetUrl(String rawValue, String label) {
		return toLiveAssetUrl(rawValue, label, null);
	}

	private String toLiveAssetUrl(String rawValue, String label, Map<String, String> liveAssetUrlCache) {
		if (rawValue == null || rawValue.isBlank()) {
			throw new AppException(
				HttpStatus.BAD_REQUEST,
				"Sweetbook 실연동에서는 " + label + "가 비어 있으면 안 됩니다. 공개 URL을 입력해 주세요."
			);
		}

		String trimmedValue = rawValue.trim();
		if (liveAssetUrlCache != null) {
			String cachedUrl = liveAssetUrlCache.get(trimmedValue);
			if (cachedUrl != null && !cachedUrl.isBlank()) {
				return cachedUrl;
			}
		}

		String resolvedUrl;
		if (trimmedValue.startsWith("data:image/")) {
			if (publicAssetPublishingService.isConfigured()) {
				resolvedUrl = publicAssetPublishingService.publishDataUrl(trimmedValue);
				cacheLiveAssetUrl(liveAssetUrlCache, trimmedValue, resolvedUrl);
				return resolvedUrl;
			}
			throw inaccessibleAsset(label, rawValue);
		}

		URI uri;
		try {
			uri = URI.create(trimmedValue);
		} catch (IllegalArgumentException exception) {
			throw new AppException(
				HttpStatus.BAD_REQUEST,
				"Sweetbook 실연동에서는 " + label + "가 올바른 URL이어야 합니다: " + summarizeAssetValue(rawValue),
				exception
			);
		}

		String publishedLocalAssetUrl = publishLocalAssetIfPossible(trimmedValue, uri);
		if (publishedLocalAssetUrl != null) {
			cacheLiveAssetUrl(liveAssetUrlCache, trimmedValue, publishedLocalAssetUrl);
			return publishedLocalAssetUrl;
		}

		if (!uri.isAbsolute()) {
			try {
				uri = URI.create(appProperties.resolvePublicUrl(trimmedValue));
			} catch (IllegalArgumentException exception) {
				throw new AppException(
					HttpStatus.BAD_REQUEST,
					"PUBLIC_BASE_URL 또는 FRONTEND_BASE_URL 설정이 올바르지 않아 Sweetbook용 공개 URL을 만들 수 없습니다.",
					exception
				);
			}
		}

		String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
		String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
		if (!"http".equals(scheme) && !"https".equals(scheme)) {
			throw inaccessibleAsset(label, rawValue);
		}
		if (host.isBlank() || isLocalOnlyHost(host)) {
			throw inaccessibleAsset(label, rawValue);
		}

		resolvedUrl = uri.toString();
		cacheLiveAssetUrl(liveAssetUrlCache, trimmedValue, resolvedUrl);
		return resolvedUrl;
	}

	private String publishLocalAssetIfPossible(String rawValue, URI uri) {
		if (!publicAssetPublishingService.isConfigured()) {
			return null;
		}

		String assetPath = extractPublishableAssetPath(rawValue, uri);
		if (assetPath == null || assetPath.isBlank()) {
			return null;
		}

		Path localAsset = resolvePublishableAssetPath(assetPath);
		if (localAsset == null) {
			return null;
		}

		return publicAssetPublishingService.publishFile(localAsset, buildPublishedAssetFileName(localAsset.getFileName().toString()));
	}

	private String extractPublishableAssetPath(String rawValue, URI uri) {
		if (uri.isAbsolute()) {
			String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
			String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
			if (("http".equals(scheme) || "https".equals(scheme)) && isLocalOnlyHost(host)) {
				return uri.getPath();
			}
			return null;
		}

		if (rawValue.startsWith("/")) {
			return rawValue;
		}
		if (rawValue.startsWith("demo-assets/") || rawValue.startsWith("api/assets/")) {
			return "/" + rawValue;
		}
		return null;
	}

	private Path resolvePublishableAssetPath(String assetPath) {
		String normalized = assetPath.replace('\\', '/');
		if (normalized.startsWith("/")) {
			normalized = normalized.substring(1);
		}

		if (normalized.startsWith("demo-assets/")) {
			return resolveAssetFromRoot(Path.of(appProperties.getDemoAssetDir()), normalized.substring("demo-assets/".length()));
		}
		if (normalized.startsWith("api/assets/")) {
			return resolveAssetFromRoot(Path.of(appProperties.getStudioAssetDir()), normalized.substring("api/assets/".length()));
		}
		return null;
	}

	private Path resolveAssetFromRoot(Path root, String relativePath) {
		Path normalizedRoot = root.toAbsolutePath().normalize();
		Path resolved = normalizedRoot.resolve(relativePath).normalize();
		if (!resolved.startsWith(normalizedRoot) || !Files.exists(resolved) || !Files.isRegularFile(resolved)) {
			return null;
		}
		return resolved;
	}

	private String buildPublishedAssetFileName(String originalFileName) {
		String sanitized = originalFileName == null ? "asset" : originalFileName.replaceAll("[^A-Za-z0-9._-]", "-");
		if (sanitized.isBlank()) {
			sanitized = "asset";
		}
		return UUID.randomUUID() + "-" + sanitized;
	}

	private String toOptionalLiveAssetUrl(String rawValue, String label) {
		return toOptionalLiveAssetUrl(rawValue, label, null);
	}

	private String toOptionalLiveAssetUrl(String rawValue, String label, Map<String, String> liveAssetUrlCache) {
		if (rawValue == null || rawValue.isBlank()) {
			return rawValue;
		}
		return toLiveAssetUrl(rawValue, label, liveAssetUrlCache);
	}

	private void cacheLiveAssetUrl(Map<String, String> liveAssetUrlCache, String rawValue, String resolvedUrl) {
		if (liveAssetUrlCache == null || rawValue == null || rawValue.isBlank() || resolvedUrl == null || resolvedUrl.isBlank()) {
			return;
		}
		liveAssetUrlCache.put(rawValue, resolvedUrl);
	}

	private boolean shouldFallbackToDemoDraft(AppException exception) {
		if (exception.getStatus() != HttpStatus.BAD_REQUEST) {
			return false;
		}
		String message = exception.getMessage();
		if (message == null) {
			return false;
		}
		return message.contains("공개 URL") || message.contains("접근 가능한");
	}

	private boolean isSimulatedBookUid(String bookUid) {
		return bookUid != null && bookUid.startsWith("demo-book-");
	}

	private AppException inaccessibleAsset(String label, String rawValue) {
		return new AppException(
			HttpStatus.BAD_REQUEST,
			"Sweetbook 실연동에서는 " + label + "가 외부에서 접근 가능한 공개 URL이어야 합니다. 현재 값 "
				+ summarizeAssetValue(rawValue)
				+ " 는 Sweetbook 서버에서 접근할 수 없습니다. 공개 HTTPS 이미지 URL을 사용하거나 "
				+ "SWEETBOOK_ENABLED=false 로 시뮬레이션 모드를 사용해 주세요."
		);
	}

	private boolean isLocalOnlyHost(String host) {
		if (host.isBlank()) {
			return true;
		}
		if ("localhost".equals(host) || "127.0.0.1".equals(host) || "0.0.0.0".equals(host) || "::1".equals(host)) {
			return true;
		}
		if ("host.docker.internal".equals(host) || host.endsWith(".local")) {
			return true;
		}
		if (host.matches("^10(\\.\\d{1,3}){3}$")) {
			return true;
		}
		if (host.matches("^192\\.168(\\.\\d{1,3}){2}$")) {
			return true;
		}
		if (host.matches("^172\\.(1[6-9]|2\\d|3[0-1])(\\.\\d{1,3}){2}$")) {
			return true;
		}
		return host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd");
	}

	private String summarizeAssetValue(String rawValue) {
		String value = rawValue == null ? "" : rawValue.trim();
		if (value.length() <= 80) {
			return "'" + value + "'";
		}
		return "'" + value.substring(0, 77) + "...'";
	}

	private BigDecimal asBigDecimal(Object value, BigDecimal fallback) {
		if (value instanceof BigDecimal decimal) {
			return decimal;
		}
		if (value instanceof Number number) {
			return BigDecimal.valueOf(number.doubleValue());
		}
		if (value instanceof String string && !string.isBlank()) {
			try {
				return new BigDecimal(string);
			} catch (NumberFormatException ignored) {
				return fallback;
			}
		}
		return fallback;
	}

	private String asString(Object value, String fallback) {
		return value == null ? fallback : String.valueOf(value);
	}

	private String fallback(String value, String fallback) {
		return value == null || value.isBlank() ? fallback : value;
	}

	private String truncate(String value, int maxLength) {
		if (value == null || value.length() <= maxLength) {
			return fallback(value, "");
		}
		return value.substring(0, maxLength);
	}

	private String normalizeOrderStatus(Map<String, Object> result) {
		String display = asString(result.get("orderStatusDisplay"), "");
		String rawStatus = asString(result.get("status"), "");
		String rawOrderStatus = asString(result.get("orderStatus"), "");

		if ("PAID".equalsIgnoreCase(rawStatus) || "20".equals(rawOrderStatus) || display.contains("결제완료")) {
			return "PAID";
		}
		if ("CANCELLED".equalsIgnoreCase(rawStatus) || display.contains("취소")) {
			return "CANCELLED";
		}
		return "ESTIMATED";
	}

	private record ResolvedTemplates(
		SweetbookViews.Template coverTemplate,
		SweetbookViews.Template publishTemplate,
		SweetbookViews.Template contentTemplate,
		SweetbookViews.Template textContentTemplate,
		SweetbookViews.Template galleryTemplate,
		SweetbookViews.Template dividerTemplate,
		SweetbookViews.Template blankTemplate
	) {
	}

	private record LiveDraftAssets(
		String coverImageUrl,
		String backCoverImageUrl
	) {
	}

	private record BookContentPage(
		String key,
		String title,
		String description,
		String primaryImageUrl,
		List<String> imageUrls,
		boolean gallery
	) {
		private static BookContentPage narrative(String key, String title, String description, String primaryImageUrl) {
			return new BookContentPage(
				key,
				title,
				description,
				primaryImageUrl,
				primaryImageUrl == null || primaryImageUrl.isBlank() ? List.of() : List.of(primaryImageUrl),
				false
			);
		}

		private static BookContentPage gallery(String key, String title, String description, List<String> imageUrls) {
			String primaryImageUrl = imageUrls.isEmpty() ? "" : imageUrls.get(0);
			return new BookContentPage(key, title, description, primaryImageUrl, List.copyOf(imageUrls), true);
		}
	}

	private record LiveContentInstruction(
		SweetbookViews.Template template,
		Map<String, Object> params,
		String breakBefore
	) {
	}

	private record PagePlan(
		int totalPages,
		int publishPages,
		int contentPages,
		int minimumPages,
		int maximumPages,
		int pageIncrement
	) {
	}
}
