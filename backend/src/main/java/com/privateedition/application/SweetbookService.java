package com.privateedition.application;

import com.privateedition.config.SweetbookProperties;
import com.privateedition.infrastructure.sweetbook.SweetbookClient;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SweetbookService {

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
					new SweetbookViews.Template("demo-cover-template", "Official Cover", "album", "cover"),
					new SweetbookViews.Template("demo-content-template", "Narrative Spread", "album", "content")
				);
			}
			return sweetbookClient.getTemplates(key);
		});
	}

	public ProjectViews.BookGeneration generateBook(ProjectViews.Preview preview) {
		List<SweetbookViews.Template> templates = getTemplates(preview.edition().snapshot().bookSpecUid());
		SweetbookViews.Template coverTemplate = chooseCoverTemplate(templates);
		SweetbookViews.Template contentTemplate = chooseContentTemplate(templates);

		if (!isLiveEnabled()) {
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

		Map<String, Object> createPayload = new LinkedHashMap<>();
		createPayload.put("bookSpecUid", preview.edition().snapshot().bookSpecUid());
		createPayload.put("title", preview.edition().title());
		createPayload.put("subtitle", preview.edition().subtitle());
		createPayload.put("metadata", Map.of(
			"projectId", preview.projectId(),
			"fanNickname", preview.personalizationData().getOrDefault("fanNickname", "Fan")
		));

		String bookUid = sweetbookClient.createBook(createPayload);

		Map<String, Object> coverParams = new LinkedHashMap<>();
		coverParams.put("title", preview.edition().title());
		coverParams.put("author", "To. " + preview.personalizationData().getOrDefault("fanNickname", "Fan"));
		coverParams.put("frontPhoto", preview.edition().coverImageUrl());
		coverParams.put("backPhoto", preview.pages().get(preview.pages().size() - 1).imageUrl());
		sweetbookClient.addCover(bookUid, coverTemplate.uid(), coverParams);

		for (ProjectViews.Page page : preview.pages().stream().skip(1).toList()) {
			Map<String, Object> pageParams = new LinkedHashMap<>();
			pageParams.put("title", page.title());
			pageParams.put("body", page.description());
			pageParams.put("image", page.imageUrl());
			pageParams.put("payload", page.payload());
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
	}

	public ProjectViews.Estimate estimateOrder(Long projectId, String bookUid, ProjectCommands.Shipping shipping) {
		if (!isLiveEnabled()) {
			return new ProjectViews.Estimate(
				projectId,
				"KRW",
				BigDecimal.valueOf(9900),
				BigDecimal.valueOf(2500),
				true,
				Map.of("message", "Sweetbook API key not configured, returning demo estimate")
			);
		}

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
	}

	public ProjectViews.OrderResult createOrder(Long projectId, String bookUid, ProjectCommands.Shipping shipping) {
		if (!isLiveEnabled()) {
			return new ProjectViews.OrderResult(
				projectId,
				"demo-order-" + UUID.randomUUID(),
				"PAID",
				BigDecimal.valueOf(9900),
				true,
				Map.of("message", "Sweetbook API key not configured, returning demo order")
			);
		}

		Map<String, Object> payload = buildOrderPayload(bookUid, normalizeShipping(shipping));
		Map<String, Object> result = sweetbookClient.createOrder(payload, UUID.randomUUID().toString());
		return new ProjectViews.OrderResult(
			projectId,
			asString(result.get("orderUid"), ""),
			asString(result.get("status"), "PAID"),
			asBigDecimal(result.get("totalAmount"), BigDecimal.ZERO),
			false,
			result
		);
	}

	private Map<String, Object> buildOrderPayload(String bookUid, ProjectCommands.Shipping shipping) {
		Map<String, Object> shippingAddress = new LinkedHashMap<>();
		shippingAddress.put("recipientName", shipping.recipientName());
		shippingAddress.put("recipientPhone", shipping.recipientPhone());
		shippingAddress.put("postalCode", shipping.postalCode());
		shippingAddress.put("address1", shipping.address1());
		shippingAddress.put("address2", shipping.address2());

		Map<String, Object> lineItem = new LinkedHashMap<>();
		lineItem.put("bookUid", bookUid);
		lineItem.put("quantity", Math.max(shipping.quantity(), 1));

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("items", List.of(lineItem));
		payload.put("shippingAddress", shippingAddress);
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

	private SweetbookViews.Template chooseCoverTemplate(List<SweetbookViews.Template> templates) {
		if (!sweetbookProperties.getDefaultCoverTemplateUid().isBlank()) {
			return templates.stream()
				.filter(template -> sweetbookProperties.getDefaultCoverTemplateUid().equals(template.uid()))
				.findFirst()
				.orElse(new SweetbookViews.Template(
					sweetbookProperties.getDefaultCoverTemplateUid(),
					"Configured Cover Template",
					sweetbookProperties.getDefaultTemplateCategory(),
					"cover"
				));
		}
		return templates.stream()
			.filter(template -> template.role().toLowerCase().contains("cover") || template.name().toLowerCase().contains("cover"))
			.findFirst()
			.orElse(templates.get(0));
	}

	private SweetbookViews.Template chooseContentTemplate(List<SweetbookViews.Template> templates) {
		if (!sweetbookProperties.getDefaultContentTemplateUid().isBlank()) {
			return templates.stream()
				.filter(template -> sweetbookProperties.getDefaultContentTemplateUid().equals(template.uid()))
				.findFirst()
				.orElse(new SweetbookViews.Template(
					sweetbookProperties.getDefaultContentTemplateUid(),
					"Configured Content Template",
					sweetbookProperties.getDefaultTemplateCategory(),
					"content"
				));
		}
		return templates.stream()
			.filter(template -> !template.role().toLowerCase().contains("cover"))
			.findFirst()
			.orElse(templates.get(0));
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
}
