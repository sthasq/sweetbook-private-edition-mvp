package com.privateedition.application;

import com.privateedition.config.SweetbookProperties;
import com.privateedition.infrastructure.sweetbook.SweetbookClient;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class SweetbookService {

	private static final Logger log = LoggerFactory.getLogger(SweetbookService.class);
	private static final int TARGET_CONTENT_PAGE_COUNT = 24;
	private static final DateTimeFormatter SWEETBOOK_DATE_RANGE_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd");
	private static final DateTimeFormatter SWEETBOOK_PUBLISH_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd");

	private final SweetbookClient sweetbookClient;
	private final SweetbookProperties sweetbookProperties;
	private final Map<String, List<SweetbookViews.Template>> templateCache = new ConcurrentHashMap<>();

	public boolean isLiveEnabled() {
		return sweetbookProperties.isLiveEnabled();
	}

	public List<SweetbookViews.BookSpec> getBookSpecs() {
		if (!isLiveEnabled()) {
			return List.of(new SweetbookViews.BookSpec(
				sweetbookProperties.getDefaultBookSpecUid(),
				"Squarebook Hardcover",
				24,
				130
			));
		}
		return sweetbookClient.getBookSpecs();
	}

	public List<SweetbookViews.Template> getTemplates(String bookSpecUid) {
		return templateCache.computeIfAbsent(bookSpecUid, key -> {
			if (!isLiveEnabled()) {
				return List.of(
					new SweetbookViews.Template(
						"demo-cover-template",
						"Official Cover",
						"album",
						"cover",
						"https://picsum.photos/seed/demo-cover-template/960/720"
					),
					new SweetbookViews.Template(
						"demo-content-template",
						"Narrative Spread",
						"album",
						"content",
						"https://picsum.photos/seed/demo-content-template/960/720"
					)
				);
			}
			return sweetbookClient.getTemplates(key);
		});
	}

	public ProjectViews.BookGeneration generateBook(ProjectViews.Preview preview) {
		List<SweetbookViews.Template> templates = resolveTemplates(preview.edition().snapshot().bookSpecUid());
		SweetbookViews.Template coverTemplate = chooseCoverTemplate(
			templates,
			preview.edition().snapshot().sweetbookCoverTemplateUid()
		);
		SweetbookViews.Template publishTemplate = choosePublishTemplate(
			templates,
			preview.edition().snapshot().sweetbookPublishTemplateUid()
		);
		SweetbookViews.Template contentTemplate = chooseContentTemplate(
			templates,
			preview.edition().snapshot().sweetbookContentTemplateUid()
		);

		if (!isLiveEnabled()) {
			return buildDemoBookGeneration(preview, coverTemplate, contentTemplate);
		}

		try {
			Map<String, Object> createPayload = new LinkedHashMap<>();
			createPayload.put("bookSpecUid", preview.edition().snapshot().bookSpecUid());
			createPayload.put("title", preview.edition().title());
			createPayload.put("subtitle", preview.edition().subtitle());
			createPayload.put("metadata", Map.of(
				"projectId", preview.projectId(),
				"fanNickname", preview.personalizationData().getOrDefault("fanNickname", "Fan")
			));

			String bookUid = sweetbookClient.createBook(createPayload);
			LocalDate today = LocalDate.now();
			String fanNickname = String.valueOf(preview.personalizationData().getOrDefault("fanNickname", "Fan"));

			Map<String, Object> coverParams = new LinkedHashMap<>();
			coverParams.put("frontPhoto", preview.edition().coverImageUrl());
			coverParams.put("backPhoto", fallbackImage(preview.pages().get(preview.pages().size() - 1).imageUrl(), preview.edition().coverImageUrl()));
			coverParams.put("dateRange", SWEETBOOK_DATE_RANGE_FORMAT.format(today) + " - " + SWEETBOOK_DATE_RANGE_FORMAT.format(today));
			coverParams.put("spineTitle", preview.edition().title());
			sweetbookClient.addCover(bookUid, coverTemplate.uid(), coverParams);

			Map<String, Object> publishParams = new LinkedHashMap<>();
			publishParams.put("title", preview.edition().title());
			publishParams.put("publishDate", SWEETBOOK_PUBLISH_DATE_FORMAT.format(today));
			publishParams.put("author", preview.edition().creator().displayName());
			sweetbookClient.addContents(bookUid, publishTemplate.uid(), publishParams, "page");

			List<ProjectViews.Page> sourcePages = buildSweetbookContentPages(preview);
			for (int index = 0; index < sourcePages.size(); index++) {
				ProjectViews.Page page = sourcePages.get(index);
				Map<String, Object> pageParams = new LinkedHashMap<>();
				pageParams.put("monthNum", String.valueOf(today.getMonthValue()));
				pageParams.put("dayNum", String.valueOf(index + 1));
				pageParams.put("diaryText", buildDiaryText(page, fanNickname));
				pageParams.put("photo", fallbackImage(page.imageUrl(), preview.edition().coverImageUrl()));
				sweetbookClient.addContents(bookUid, contentTemplate.uid(), pageParams, "page");
			}

			sweetbookClient.finalizeBook(bookUid);

			return new ProjectViews.BookGeneration(
				preview.projectId(),
				bookUid,
				"FINALIZED",
				preview.edition().snapshot().bookSpecUid(),
				coverTemplate.uid(),
				contentTemplate.uid(),
				false
			);
		} catch (RuntimeException exception) {
			log.warn("Sweetbook live generateBook failed. Falling back to simulated response.", exception);
			return buildDemoBookGeneration(preview, coverTemplate, contentTemplate);
		}
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

	public ProjectViews.OrderResult createOrder(Long projectId, String bookUid, ProjectCommands.Shipping shipping) {
		if (!isLiveEnabled()) {
			return buildDemoOrder(projectId, "Sweetbook API key not configured, returning demo order");
		}

		try {
			Map<String, Object> payload = buildOrderPayload(bookUid, normalizeShipping(shipping));
			Map<String, Object> result = sweetbookClient.createOrder(payload, UUID.randomUUID().toString());
			return new ProjectViews.OrderResult(
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

	private List<SweetbookViews.Template> resolveTemplates(String bookSpecUid) {
		if (!isLiveEnabled()) {
			return demoTemplates();
		}

		try {
			return getTemplates(bookSpecUid);
		} catch (RuntimeException exception) {
			log.warn("Sweetbook live template lookup failed. Falling back to demo templates.", exception);
			return demoTemplates();
		}
	}

	private List<SweetbookViews.Template> demoTemplates() {
		return List.of(
			new SweetbookViews.Template(
				"demo-cover-template",
				"Official Cover",
				"album",
				"cover",
				"https://picsum.photos/seed/demo-cover-template/960/720"
			),
			new SweetbookViews.Template(
				"demo-content-template",
				"Narrative Spread",
				"album",
				"content",
				"https://picsum.photos/seed/demo-content-template/960/720"
			)
		);
	}

	private ProjectViews.BookGeneration buildDemoBookGeneration(
		ProjectViews.Preview preview,
		SweetbookViews.Template coverTemplate,
		SweetbookViews.Template contentTemplate
	) {
		return new ProjectViews.BookGeneration(
			preview.projectId(),
			"demo-book-" + preview.projectId() + "-" + Instant.now().toEpochMilli(),
			"FINALIZED",
			preview.edition().snapshot().bookSpecUid(),
			coverTemplate.uid(),
			contentTemplate.uid(),
			true
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

	private ProjectViews.OrderResult buildDemoOrder(Long projectId, String message) {
		return new ProjectViews.OrderResult(
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
				fallback(shipping.recipientName(), "Private Edition Fan"),
				fallback(shipping.recipientPhone(), "010-0000-0000"),
				fallback(shipping.postalCode(), "00000"),
				fallback(shipping.address1(), "Demo Address"),
				fallback(shipping.address2(), ""),
				Math.max(shipping.quantity(), 1)
			);
		}
		return new ProjectCommands.Shipping(
			"Private Edition Fan",
			"010-0000-0000",
			"00000",
			"Demo Address",
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

	private List<ProjectViews.Page> buildSweetbookContentPages(ProjectViews.Preview preview) {
		List<ProjectViews.Page> available = preview.pages().stream().skip(1).toList();
		if (available.isEmpty()) {
			return List.of();
		}

		List<ProjectViews.Page> result = new ArrayList<>();
		for (int index = 0; index < TARGET_CONTENT_PAGE_COUNT; index++) {
			result.add(available.get(index % available.size()));
		}
		return result;
	}

	private String buildDiaryText(ProjectViews.Page page, String fanNickname) {
		String description = fallback(page.description(), "Private Edition keepsake page");
		String text = page.title() + "\n" + description + "\nTo. " + fanNickname;
		return text.length() > 450 ? text.substring(0, 450) : text;
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
}
