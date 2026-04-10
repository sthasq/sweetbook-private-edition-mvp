package com.playpick.application;

import com.playpick.domain.AppUser;
import com.playpick.domain.AppUserRole;
import com.playpick.domain.CustomerOrder;
import com.playpick.domain.CustomerOrderRepository;
import com.playpick.domain.FulfillmentStatus;
import com.playpick.domain.OrderRecord;
import com.playpick.domain.OrderRecordRepository;
import com.playpick.domain.OrderStatus;
import com.playpick.security.CurrentUserService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudioOrderService {

	private static final int RECENT_ORDER_LIMIT = 12;

	private final CustomerOrderRepository customerOrderRepository;
	private final OrderRecordRepository orderRecordRepository;
	private final CurrentUserService currentUserService;

	public StudioViews.OrderDashboard getOrderDashboard() {
		AppUser currentUser = currentUserService.requireCurrentAppUser(AppUserRole.CREATOR);
		List<CustomerOrder> orders = customerOrderRepository.findAllByCreatorUserIdOrderByOrderedAtDesc(currentUser.getId());
		if (orders.isEmpty()) {
			return new StudioViews.OrderDashboard(0, 0, BigDecimal.ZERO, List.of());
		}

		Map<Long, OrderRecord> orderRecordsByProjectId = orderRecordRepository.findByFanProjectIdIn(
			orders.stream()
				.map(order -> order.getFanProject().getId())
				.toList()
		).stream().collect(
			java.util.stream.Collectors.toMap(
				record -> record.getFanProject().getId(),
				Function.identity()
			)
		);

		BigDecimal totalRevenue = orders.stream()
			.filter(order -> order.getStatus() == OrderStatus.PAID)
			.map(CustomerOrder::getTotalAmount)
			.reduce(BigDecimal.ZERO, BigDecimal::add);

		long paidOrders = orders.stream()
			.filter(order -> order.getStatus() == OrderStatus.PAID)
			.count();

		List<StudioViews.OrderSummary> recentOrders = orders.stream()
			.limit(RECENT_ORDER_LIMIT)
			.map(order -> toOrderSummary(order, orderRecordsByProjectId.get(order.getFanProject().getId())))
			.toList();

		return new StudioViews.OrderDashboard(
			orders.size(),
			paidOrders,
			totalRevenue,
			recentOrders
		);
	}

	private StudioViews.OrderSummary toOrderSummary(CustomerOrder order, OrderRecord orderRecord) {
		return new StudioViews.OrderSummary(
			order.getFanProject().getId(),
			order.getFanProject().getEditionVersion().getEdition().getId(),
			order.getFanProject().getEditionVersion().getEdition().getTitle(),
			order.getFanProject().getOwnerUser().getDisplayName(),
			order.getRecipientName(),
			maskPhoneNumber(order.getRecipientPhone()),
			buildAddressSummary(order.getAddress1(), order.getAddress2(), order.getPostalCode()),
			order.getQuantity(),
			order.getTotalAmount(),
			order.getOrderUid(),
			order.getStatus().name(),
			resolveFulfillmentStatus(orderRecord),
			blankToNull(order.getPaymentProvider()),
			blankToNull(order.getPaymentMethod()),
			order.isSimulated(),
			order.getOrderedAt()
		);
	}

	private String resolveFulfillmentStatus(OrderRecord orderRecord) {
		if (orderRecord == null || orderRecord.getStatus() == null) {
			return FulfillmentStatus.PENDING_SUBMISSION.name();
		}
		return orderRecord.getStatus().name();
	}

	private String maskPhoneNumber(String phoneNumber) {
		if (phoneNumber == null || phoneNumber.isBlank()) {
			return "";
		}
		String digitsOnly = phoneNumber.replaceAll("\\D", "");
		if (digitsOnly.length() < 7) {
			return phoneNumber;
		}

		int visibleSuffixLength = Math.min(4, digitsOnly.length());
		int visiblePrefixLength = Math.min(3, Math.max(1, digitsOnly.length() - visibleSuffixLength - 2));
		String prefix = digitsOnly.substring(0, visiblePrefixLength);
		String suffix = digitsOnly.substring(digitsOnly.length() - visibleSuffixLength);
		return prefix + "-****-" + suffix;
	}

	private String buildAddressSummary(String address1, String address2, String postalCode) {
		String primaryAddress = blankToNull(address1);
		String secondaryAddress = blankToNull(address2);
		String zipCode = blankToNull(postalCode);

		if (primaryAddress == null && secondaryAddress == null) {
			return zipCode == null ? "" : "(" + zipCode + ")";
		}

		StringBuilder summary = new StringBuilder();
		if (zipCode != null) {
			summary.append("(").append(zipCode).append(") ");
		}
		if (primaryAddress != null) {
			summary.append(primaryAddress);
		}
		if (secondaryAddress != null) {
			summary.append(" ").append(secondaryAddress);
		}
		return summary.toString().trim();
	}

	private String blankToNull(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return value;
	}
}
