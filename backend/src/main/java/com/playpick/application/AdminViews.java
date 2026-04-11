package com.playpick.application;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class AdminViews {

	private AdminViews() {
	}

	public record Dashboard(
		long totalOrders,
		BigDecimal totalRevenue,
		BigDecimal platformRevenue,
		BigDecimal creatorPayouts,
		BigDecimal commissionRate,
		long activeEditions,
		long totalUsers,
		long totalCreators,
		long simulatedOrders
	) {
	}

	public record CreatorSettlement(
		Long creatorId,
		String displayName,
		String channelHandle,
		boolean verified,
		long totalOrders,
		BigDecimal totalRevenue,
		BigDecimal platformCommission,
		BigDecimal creatorPayout
	) {
	}

	public record OrderSummary(
		Long projectId,
		Long editionId,
		String editionTitle,
		String creatorName,
		String fanDisplayName,
		String recipientName,
		int quantity,
		BigDecimal totalAmount,
		BigDecimal platformFee,
		BigDecimal creatorPayout,
		BigDecimal commissionRate,
		String siteOrderUid,
		String siteOrderStatus,
		String fulfillmentStatus,
		String lastEventType,
		Instant lastEventAt,
		String paymentProvider,
		String paymentMethod,
		boolean simulated,
		Instant orderedAt
	) {
	}

	public record WebhookEventSummary(
		Long id,
		String eventType,
		String sweetbookOrderUid,
		Instant processedAt,
		Instant createdAt,
		boolean linked
	) {
	}

	public record UserSummary(
		Long id,
		String email,
		String displayName,
		String role,
		Instant createdAt,
		Boolean creatorVerified
	) {
	}
}
