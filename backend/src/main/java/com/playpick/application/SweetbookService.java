package com.playpick.application;

import com.playpick.config.AppProperties;
import com.playpick.config.SweetbookProperties;
import com.playpick.infrastructure.sweetbook.SweetbookClient;
import java.math.BigDecimal;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
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
			return List.of(new SweetbookViews.BookSpec(
				sweetbookProperties.getDefaultBookSpecUid(),
				"Squarebook Hardcover",
				24,
				130,
				2
			));
		}
		return sweetbookClient.getBookSpecs();
	}

	@Cacheable(cacheNames = "sweetbook-templates", key = "#bookSpecUid")
	public List<SweetbookViews.Template> getTemplates(String bookSpecUid) {
		if (!isLiveEnabled()) {
			return List.of(
				new SweetbookViews.Template(
					sweetbookProperties.getDefaultCoverTemplateUid(),
					"표지",
					"album",
					"cover",
					"https://picsum.photos/seed/demo-cover-template/960/720"
				),
				new SweetbookViews.Template(
					sweetbookProperties.getDefaultPublishTemplateUid(),
					"발행면",
					"album",
					"publish",
					"https://picsum.photos/seed/demo-publish-template/960/720"
				),
				new SweetbookViews.Template(
					sweetbookProperties.getDefaultContentTemplateUid(),
					"내지a_contain",
					"album",
					"content",
					"https://picsum.photos/seed/demo-content-template/960/720"
				),
				new SweetbookViews.Template(
					sweetbookProperties.getDefaultContentTextTemplateUid(),
					"내지b",
					"album",
					"content",
					"https://picsum.photos/seed/demo-content-text-template/960/720"
				),
				new SweetbookViews.Template(
					sweetbookProperties.getDefaultContentGalleryTemplateUid(),
					"내지_gallery",
					"album",
					"content",
					"https://picsum.photos/seed/demo-content-gallery-template/960/720"
				),
				new SweetbookViews.Template(
					sweetbookProperties.getDefaultDividerTemplateUid(),
					"간지",
					"album",
					"divider",
					"https://picsum.photos/seed/demo-divider-template/960/720"
				)
			);
		}
		return sweetbookClient.getTemplates(bookSpecUid);
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

		LiveDraftAssets liveDraftAssets = prepareLiveDraftAssets(preview, pagePlan);

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
			addDraftContents(preview, resolvedTemplates, pagePlan, bookUid, liveDraftAssets);

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

		if (!isLiveEnabled()) {
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
		if (!isLiveEnabled()) {
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
		if (!isLiveEnabled()) {
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
		LiveDraftAssets liveDraftAssets
	) {
		LocalDate today = LocalDate.now();
		String fanNickname = String.valueOf(preview.personalizationData().getOrDefault("fanNickname", "팬"));

		Map<String, Object> coverParams = new LinkedHashMap<>();
		coverParams.put("frontPhoto", liveDraftAssets.coverImageUrl());
		coverParams.put("backPhoto", liveDraftAssets.backCoverImageUrl());
		coverParams.put(
			"dateRange",
			SWEETBOOK_DATE_RANGE_FORMAT.format(today) + " - " + SWEETBOOK_DATE_RANGE_FORMAT.format(today)
		);
		coverParams.put("spineTitle", preview.edition().title());
		sweetbookClient.addCover(bookUid, resolvedTemplates.coverTemplate().uid(), coverParams);

		Map<String, Object> publishParams = new LinkedHashMap<>();
		publishParams.put("photo", liveDraftAssets.coverImageUrl());
		publishParams.put("title", preview.edition().title());
		publishParams.put("publishDate", SWEETBOOK_PUBLISH_DATE_FORMAT.format(today));
		publishParams.put("author", preview.edition().creator().displayName());
		publishParams.put("publisher", "PlayPick");
		publishParams.put("hashtags", "#PlayPick #CollabArchive");
		sweetbookClient.addContents(bookUid, resolvedTemplates.publishTemplate().uid(), publishParams, "page");

		List<ProjectViews.Page> sourcePages = buildSweetbookContentPages(preview, pagePlan.contentPages());
		List<LiveContentInstruction> instructions = buildLiveContentInstructions(
			sourcePages,
			liveDraftAssets.contentImageUrls(),
			resolvedTemplates,
			fanNickname,
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
	}

	private LiveDraftAssets prepareLiveDraftAssets(ProjectViews.Preview preview, PagePlan pagePlan) {
		String coverImageUrl = toLiveAssetUrl(preview.edition().coverImageUrl(), "커버 이미지");
		String backCoverImageUrl = toLiveAssetUrl(
			fallbackImage(preview.pages().get(preview.pages().size() - 1).imageUrl(), preview.edition().coverImageUrl()),
			"뒷표지 이미지"
		);

		List<ProjectViews.Page> sourcePages = buildSweetbookContentPages(preview, pagePlan.contentPages());
		List<String> contentImageUrls = new ArrayList<>();
		for (int index = 0; index < sourcePages.size(); index++) {
			ProjectViews.Page page = sourcePages.get(index);
			contentImageUrls.add(toLiveAssetUrl(
				fallbackImage(page.imageUrl(), preview.edition().coverImageUrl()),
				"내지 이미지 " + (index + 1)
			));
		}

		return new LiveDraftAssets(coverImageUrl, backCoverImageUrl, contentImageUrls);
	}

	private ResolvedTemplates resolveTemplatesForPreview(ProjectViews.Preview preview) {
		List<SweetbookViews.Template> templates = resolveTemplates(preview.edition().snapshot().bookSpecUid());
		return new ResolvedTemplates(
			chooseCoverTemplate(templates, preview.edition().snapshot().sweetbookCoverTemplateUid()),
			choosePublishTemplate(templates, preview.edition().snapshot().sweetbookPublishTemplateUid()),
			chooseContentTemplate(templates, preview.edition().snapshot().sweetbookContentTemplateUid()),
			chooseOptionalTemplate(templates, sweetbookProperties.getDefaultContentTextTemplateUid()),
			chooseOptionalTemplate(templates, sweetbookProperties.getDefaultContentGalleryTemplateUid()),
			chooseTemplate(
				templates,
				sweetbookProperties.getDefaultDividerTemplateUid(),
				"divider",
				""
			)
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
		return preview.pages().size() + 4;
	}

	private List<ProjectViews.Page> buildSweetbookContentPages(ProjectViews.Preview preview, int contentPageCount) {
		List<ProjectViews.Page> available = preview.pages().stream().skip(1).toList();
		if (available.isEmpty()) {
			return List.of();
		}

		List<ProjectViews.Page> result = new ArrayList<>();
		for (int index = 0; index < contentPageCount; index++) {
			result.add(available.get(index % available.size()));
		}
		return result;
	}

	private List<LiveContentInstruction> buildLiveContentInstructions(
		List<ProjectViews.Page> sourcePages,
		List<String> sourceImageUrls,
		ResolvedTemplates resolvedTemplates,
		String fanNickname,
		LocalDate today,
		int contentPageCount
	) {
		List<LiveContentInstruction> instructions = new ArrayList<>();
		int chunkSize = 6;
		int chapterNumber = 1;
		for (int chunkStart = 0; chunkStart < sourcePages.size() && instructions.size() < contentPageCount; chunkStart += chunkSize) {
			int chunkEnd = Math.min(chunkStart + chunkSize, sourcePages.size());
			List<ProjectViews.Page> chunkPages = sourcePages.subList(chunkStart, chunkEnd);
			List<String> chunkImages = sourceImageUrls.subList(chunkStart, chunkEnd);
			if (resolvedTemplates.dividerTemplate() != null && instructions.size() < contentPageCount) {
				instructions.add(new LiveContentInstruction(
					resolvedTemplates.dividerTemplate(),
					buildDividerParams(chunkPages.get(0), chapterNumber++, today),
					"page"
				));
			}
			if (resolvedTemplates.galleryTemplate() != null && chunkImages.size() >= 2 && instructions.size() < contentPageCount) {
				instructions.add(new LiveContentInstruction(
					resolvedTemplates.galleryTemplate(),
					buildGalleryParams(chunkPages, chunkImages, today),
					"page"
				));
			}
			for (int index = 0; index < chunkPages.size() && instructions.size() < contentPageCount; index++) {
				ProjectViews.Page page = chunkPages.get(index);
				boolean useTextTemplate = resolvedTemplates.textContentTemplate() != null && index % 2 == 1;
				SweetbookViews.Template template = useTextTemplate
					? resolvedTemplates.textContentTemplate()
					: resolvedTemplates.contentTemplate();
				Map<String, Object> params = useTextTemplate
					? buildTextPageParams(page, fanNickname, today, chunkStart + index)
					: buildPhotoPageParams(page, chunkImages.get(index), fanNickname, today, chunkStart + index);
				instructions.add(new LiveContentInstruction(template, params, "page"));
			}
		}
		int backfillIndex = 0;
		while (!sourcePages.isEmpty() && instructions.size() < contentPageCount) {
			ProjectViews.Page page = sourcePages.get(backfillIndex % sourcePages.size());
			String imageUrl = sourceImageUrls.get(backfillIndex % sourceImageUrls.size());
			instructions.add(new LiveContentInstruction(
				resolvedTemplates.contentTemplate(),
				buildPhotoPageParams(page, imageUrl, fanNickname, today, backfillIndex),
				"page"
			));
			backfillIndex++;
		}
		return instructions;
	}

	private Map<String, Object> buildDividerParams(ProjectViews.Page page, int chapterNumber, LocalDate today) {
		Map<String, Object> params = new LinkedHashMap<>();
		params.put("chapterNum", "%02d".formatted(chapterNumber));
		params.put("seasonTitle", truncate(page.title(), 28));
		params.put("year", String.valueOf(today.getYear()));
		return params;
	}

	private Map<String, Object> buildGalleryParams(
		List<ProjectViews.Page> pages,
		List<String> imageUrls,
		LocalDate today
	) {
		Map<String, Object> params = new LinkedHashMap<>();
		params.put("date", SWEETBOOK_DATE_RANGE_FORMAT.format(today));
		params.put("collagePhotos", imageUrls.stream().limit(3).toList());
		return params;
	}

	private Map<String, Object> buildPhotoPageParams(
		ProjectViews.Page page,
		String imageUrl,
		String fanNickname,
		LocalDate today,
		int index
	) {
		Map<String, Object> params = new LinkedHashMap<>();
		params.put("photo1", imageUrl);
		params.put("date", SWEETBOOK_DATE_RANGE_FORMAT.format(today.plusDays(index)));
		params.put("title", truncate(page.title(), 40));
		params.put("diaryText", buildDiaryText(page, fanNickname));
		return params;
	}

	private Map<String, Object> buildTextPageParams(
		ProjectViews.Page page,
		String fanNickname,
		LocalDate today,
		int index
	) {
		Map<String, Object> params = new LinkedHashMap<>();
		params.put("date", SWEETBOOK_DATE_RANGE_FORMAT.format(today.plusDays(index)));
		params.put("title", truncate(page.title(), 40));
		params.put("diaryText", buildDiaryText(page, fanNickname));
		return params;
	}

	private String buildDiaryText(ProjectViews.Page page, String fanNickname) {
		String description = fallback(page.description(), "PlayPick 굿즈 페이지");
		String text = page.title() + "\n" + description + "\n" + fanNickname + "님을 위해";
		return text.length() > 450 ? text.substring(0, 450) : text;
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
		if (rawValue == null || rawValue.isBlank()) {
			throw new AppException(
				HttpStatus.BAD_REQUEST,
				"Sweetbook 실연동에서는 " + label + "가 비어 있으면 안 됩니다. 공개 URL을 입력해 주세요."
			);
		}

		String trimmedValue = rawValue.trim();
		if (trimmedValue.startsWith("data:image/")) {
			if (publicAssetPublishingService.isConfigured()) {
				return publicAssetPublishingService.publishDataUrl(trimmedValue);
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

		if (!uri.isAbsolute()) {
			URI frontendBaseUri;
			try {
				frontendBaseUri = URI.create(appProperties.getEffectivePublicBaseUrl());
			} catch (IllegalArgumentException exception) {
				throw new AppException(
					HttpStatus.BAD_REQUEST,
					"PUBLIC_BASE_URL 또는 FRONTEND_BASE_URL 설정이 올바르지 않아 Sweetbook용 공개 URL을 만들 수 없습니다.",
					exception
				);
			}
			uri = frontendBaseUri.resolve(rawValue.startsWith("/") ? rawValue : "/" + rawValue);
		}

		String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
		String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
		if (!"http".equals(scheme) && !"https".equals(scheme)) {
			throw inaccessibleAsset(label, rawValue);
		}
		if (host.isBlank() || isLocalOnlyHost(host)) {
			throw inaccessibleAsset(label, rawValue);
		}

		return uri.toString();
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
		SweetbookViews.Template dividerTemplate
	) {
	}

	private record LiveDraftAssets(
		String coverImageUrl,
		String backCoverImageUrl,
		List<String> contentImageUrls
	) {
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
