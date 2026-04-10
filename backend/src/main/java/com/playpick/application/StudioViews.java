package com.playpick.application;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class StudioViews {

	private StudioViews() {
	}

	public record OrderDashboard(
		long totalOrders,
		long paidOrders,
		BigDecimal totalRevenue,
		List<OrderSummary> recentOrders
	) {
	}

	public record OrderSummary(
		Long projectId,
		Long editionId,
		String editionTitle,
		String fanDisplayName,
		String recipientName,
		String recipientPhoneMasked,
		String addressSummary,
		int quantity,
		BigDecimal totalAmount,
		String siteOrderUid,
		String siteOrderStatus,
		String fulfillmentStatus,
		String paymentProvider,
		String paymentMethod,
		boolean simulated,
		Instant orderedAt
	) {
	}
}
