package com.playpick.application;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class ProjectViews {

	private ProjectViews() {
	}

	public record Snapshot(
		Long id,
		Long editionId,
		Long editionVersionId,
		String status,
		Map<String, Object> personalizationData,
		String sweetbookBookUid,
		String sweetbookExternalRef,
		Instant sweetbookDraftCreatedAt,
		Instant sweetbookFinalizedAt,
		Instant createdAt,
		Instant updatedAt
	) {
	}

	public record Preview(
		Long projectId,
		String status,
		String mode,
		EditionViews.Detail edition,
		Map<String, Object> personalizationData,
		String sweetbookBookUid,
		String sweetbookExternalRef,
		Instant sweetbookDraftCreatedAt,
		Instant sweetbookFinalizedAt,
		List<Page> pages
	) {
	}

	public record Page(
		String key,
		String title,
		String description,
		String imageUrl,
		Map<String, Object> payload
	) {
	}

	public record BookGeneration(
		Long projectId,
		String bookUid,
		String status,
		String projectStatus,
		String bookSpecUid,
		String coverTemplateUid,
		String publishTemplateUid,
		String contentTemplateUid,
		int plannedPageCount,
		boolean simulated,
		boolean reused
	) {
	}

	public record ChatPersonalization(
		String reply,
		Map<String, Object> proposal,
		boolean done,
		List<String> suggestedReplies
	) {
	}

	public record Estimate(
		Long projectId,
		String currency,
		BigDecimal totalAmount,
		BigDecimal vendorCost,
		BigDecimal shippingFee,
		BigDecimal marginAmount,
		BigDecimal platformFee,
		BigDecimal creatorPayout,
		boolean simulated,
		Map<String, Object> raw
	) {
	}

	public record FulfillmentResult(
		Long projectId,
		String orderUid,
		String status,
		BigDecimal totalAmount,
		boolean simulated,
		Map<String, Object> raw
	) {
	}

	public record PaymentSession(
		Long projectId,
		String provider,
		boolean enabled,
		String clientKey,
		String customerKey,
		String orderId,
		String orderName,
		BigDecimal amount,
		String customerName,
		String customerEmail,
		String customerMobilePhone,
		String successUrl,
		String failUrl
	) {
	}

	public record OrderResult(
		Long projectId,
		String siteOrderUid,
		String siteOrderStatus,
		String fulfillmentOrderUid,
		String fulfillmentStatus,
		BigDecimal totalAmount,
		boolean simulated,
		Map<String, Object> raw
	) {
	}

	public record OrderSummary(
		Long projectId,
		String projectStatus,
		String siteOrderStatus,
		String siteOrderUid,
		String fulfillmentStatus,
		String fulfillmentOrderUid,
		String lastFulfillmentEvent,
		Instant lastFulfillmentEventAt,
		BigDecimal totalAmount,
		boolean simulated,
		Instant orderedAt,
		OrderShipping shipping,
		OrderEdition edition
	) {
	}

	public record OrderShipping(
		String recipientName,
		String recipientPhone,
		String postalCode,
		String address1,
		String address2
	) {
	}

	public record OrderEdition(
		Long id,
		String title,
		EditionViews.Creator creator
	) {
	}

	public record MyProjectSummary(
		Long projectId,
		Long editionId,
		String editionTitle,
		String editionCoverImageUrl,
		String status,
		String mode,
		String siteOrderStatus,
		String fulfillmentStatus,
		String lastFulfillmentEvent,
		Instant lastFulfillmentEventAt,
		Instant updatedAt,
		String continuePath
	) {
	}
}
