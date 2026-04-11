package com.playpick.application;

import com.playpick.config.SweetbookProperties;
import com.playpick.infrastructure.sweetbook.SweetbookClient;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
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
					"demo-cover-template",
					"기본 커버",
					"album",
					"cover",
					"https://picsum.photos/seed/demo-cover-template/960/720"
				),
				new SweetbookViews.Template(
					"demo-publish-template",
					"발행면",
					"album",
					"publish",
					"https://picsum.photos/seed/demo-publish-template/960/720"
				),
				new SweetbookViews.Template(
					"demo-content-template",
					"기본 펼침면",
					"album",
					"content",
					"https://picsum.photos/seed/demo-content-template/960/720"
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
		PagePlan pagePlan = planPages(resolveBookSpec(preview.edition().snapshot().bookSpecUid()));

		if (!isLiveEnabled()) {
			return buildDemoBookGeneration(preview, resolvedTemplates, pagePlan, "DRAFT", "BOOK_CREATED", reused, null);
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
			addDraftContents(preview, resolvedTemplates, pagePlan, bookUid);

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
			log.warn("Sweetbook live draft generation failed. Falling back to simulated response.", exception);
			return buildDemoBookGeneration(preview, resolvedTemplates, pagePlan, "DRAFT", "BOOK_CREATED", reused, null);
		}
	}

	public ProjectViews.BookGeneration finalizeBook(
		ProjectViews.Preview preview,
		String bookUid,
		boolean reused
	) {
		ResolvedTemplates resolvedTemplates = resolveTemplatesForPreview(preview);
		PagePlan pagePlan = planPages(resolveBookSpec(preview.edition().snapshot().bookSpecUid()));

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
			log.warn("Sweetbook live finalization failed. Falling back to simulated response.", exception);
			return buildDemoBookGeneration(preview, resolvedTemplates, pagePlan, "FINALIZED", "FINALIZED", reused, bookUid);
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
		PagePlan pagePlan = planPages(resolveBookSpec(preview.edition().snapshot().bookSpecUid()));
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
			return new ProjectViews.Estimate(
				projectId,
				asString(result.get("currency"), "KRW"),
				asBigDecimal(result.get("totalAmount"), BigDecimal.ZERO),
				asBigDecimal(result.get("shippingFee"), BigDecimal.ZERO),
				false,
				result
			);
		} catch (RuntimeException exception) {
			log.warn("Sweetbook live estimate failed. Falling back to simulated response.", exception);
			return buildDemoEstimate(projectId, "Sweetbook live estimate failed, returning demo estimate");
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
			log.warn("Sweetbook live order failed. Falling back to simulated response.", exception);
			return buildDemoOrder(projectId, "Sweetbook live order failed, returning demo order");
		}
	}

	private void addDraftContents(
		ProjectViews.Preview preview,
		ResolvedTemplates resolvedTemplates,
		PagePlan pagePlan,
		String bookUid
	) {
		LocalDate today = LocalDate.now();
		String fanNickname = String.valueOf(preview.personalizationData().getOrDefault("fanNickname", "팬"));

		Map<String, Object> coverParams = new LinkedHashMap<>();
		coverParams.put("frontPhoto", preview.edition().coverImageUrl());
		coverParams.put(
			"backPhoto",
			fallbackImage(preview.pages().get(preview.pages().size() - 1).imageUrl(), preview.edition().coverImageUrl())
		);
		coverParams.put(
			"dateRange",
			SWEETBOOK_DATE_RANGE_FORMAT.format(today) + " - " + SWEETBOOK_DATE_RANGE_FORMAT.format(today)
		);
		coverParams.put("spineTitle", preview.edition().title());
		sweetbookClient.addCover(bookUid, resolvedTemplates.coverTemplate().uid(), coverParams);

		Map<String, Object> publishParams = new LinkedHashMap<>();
		publishParams.put("title", preview.edition().title());
		publishParams.put("publishDate", SWEETBOOK_PUBLISH_DATE_FORMAT.format(today));
		publishParams.put("author", preview.edition().creator().displayName());
		sweetbookClient.addContents(bookUid, resolvedTemplates.publishTemplate().uid(), publishParams, "page");

		List<ProjectViews.Page> sourcePages = buildSweetbookContentPages(preview, pagePlan.contentPages());
		for (int index = 0; index < sourcePages.size(); index++) {
			ProjectViews.Page page = sourcePages.get(index);
			Map<String, Object> pageParams = new LinkedHashMap<>();
			pageParams.put("monthNum", String.valueOf(today.getMonthValue()));
			pageParams.put("dayNum", String.valueOf(index + 1));
			pageParams.put("diaryText", buildDiaryText(page, fanNickname));
			pageParams.put("photo", fallbackImage(page.imageUrl(), preview.edition().coverImageUrl()));
			sweetbookClient.addContents(bookUid, resolvedTemplates.contentTemplate().uid(), pageParams, "page");
		}
	}

	private ResolvedTemplates resolveTemplatesForPreview(ProjectViews.Preview preview) {
		List<SweetbookViews.Template> templates = resolveTemplates(preview.edition().snapshot().bookSpecUid());
		return new ResolvedTemplates(
			chooseCoverTemplate(templates, preview.edition().snapshot().sweetbookCoverTemplateUid()),
			choosePublishTemplate(templates, preview.edition().snapshot().sweetbookPublishTemplateUid()),
			chooseContentTemplate(templates, preview.edition().snapshot().sweetbookContentTemplateUid())
		);
	}

	private List<SweetbookViews.Template> resolveTemplates(String bookSpecUid) {
		if (!isLiveEnabled()) {
			return getTemplates(bookSpecUid);
		}

		try {
			return getTemplates(bookSpecUid);
		} catch (RuntimeException exception) {
			log.warn("Sweetbook live template lookup failed. Falling back to demo templates.", exception);
			return List.of(
				new SweetbookViews.Template("demo-cover-template", "기본 커버", "album", "cover", ""),
				new SweetbookViews.Template("demo-publish-template", "발행면", "album", "publish", ""),
				new SweetbookViews.Template("demo-content-template", "기본 펼침면", "album", "content", "")
			);
		}
	}

	private SweetbookViews.BookSpec resolveBookSpec(String bookSpecUid) {
		return getBookSpecs().stream()
			.filter(spec -> spec.uid().equals(bookSpecUid))
			.findFirst()
			.orElse(new SweetbookViews.BookSpec(bookSpecUid, bookSpecUid, 24, 130, 2));
	}

	private PagePlan planPages(SweetbookViews.BookSpec bookSpec) {
		int minimumPages = positive(bookSpec.minPages(), DEFAULT_TOTAL_PAGE_COUNT);
		int maximumPages = Math.max(minimumPages, positive(bookSpec.maxPages(), minimumPages));
		int pageIncrement = positive(bookSpec.pageIncrement(), DEFAULT_PAGE_INCREMENT);

		int totalPages = minimumPages;
		if ((totalPages - minimumPages) % pageIncrement != 0) {
			totalPages = minimumPages;
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
		return new ProjectViews.Estimate(
			projectId,
			"KRW",
			BigDecimal.valueOf(9900),
			BigDecimal.valueOf(2500),
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

	private String fallbackImage(String value, String fallback) {
		return value == null || value.isBlank() ? fallback : value;
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
		SweetbookViews.Template contentTemplate
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
