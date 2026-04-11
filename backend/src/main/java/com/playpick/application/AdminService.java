package com.playpick.application;

import com.playpick.config.AppProperties;
import com.playpick.domain.AppUser;
import com.playpick.domain.AppUserRepository;
import com.playpick.domain.AppUserRole;
import com.playpick.domain.CreatorProfile;
import com.playpick.domain.CreatorProfileRepository;
import com.playpick.domain.CustomerOrder;
import com.playpick.domain.CustomerOrderRepository;
import com.playpick.domain.EditionRepository;
import com.playpick.domain.EditionStatus;
import com.playpick.domain.FulfillmentStatus;
import com.playpick.domain.OrderRecord;
import com.playpick.domain.OrderRecordRepository;
import com.playpick.domain.OrderStatus;
import com.playpick.domain.SweetbookWebhookEvent;
import com.playpick.domain.SweetbookWebhookEventRepository;
import com.playpick.security.CurrentUserService;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

	private final CustomerOrderRepository customerOrderRepository;
	private final OrderRecordRepository orderRecordRepository;
	private final EditionRepository editionRepository;
	private final AppUserRepository appUserRepository;
	private final CreatorProfileRepository creatorProfileRepository;
	private final SweetbookWebhookEventRepository sweetbookWebhookEventRepository;
	private final CurrentUserService currentUserService;
	private final AppProperties appProperties;

	public AdminViews.Dashboard getDashboard() {
		requireAdmin();
		List<CustomerOrder> allOrders = customerOrderRepository.findAll();

		long totalOrders = allOrders.size();
		BigDecimal totalRevenue = BigDecimal.ZERO;
		BigDecimal vendorCosts = BigDecimal.ZERO;
		BigDecimal grossMargin = BigDecimal.ZERO;
		BigDecimal platformRevenue = BigDecimal.ZERO;
		BigDecimal creatorPayouts = BigDecimal.ZERO;
		long simulatedOrders = 0;

		for (CustomerOrder order : allOrders) {
			if (order.getStatus() == OrderStatus.PAID) {
				totalRevenue = totalRevenue.add(order.getTotalAmount());
				vendorCosts = vendorCosts.add(order.getVendorCost());
				grossMargin = grossMargin.add(order.getMarginAmount());
				platformRevenue = platformRevenue.add(order.getPlatformFee());
				creatorPayouts = creatorPayouts.add(order.getCreatorPayout());
			}
			if (order.isSimulated()) {
				simulatedOrders++;
			}
		}

		long activeEditions = editionRepository.findByStatusOrderByUpdatedAtDesc(EditionStatus.PUBLISHED).size();
		long totalUsers = appUserRepository.count();
		long totalCreators = creatorProfileRepository.count();

		return new AdminViews.Dashboard(
			totalOrders, totalRevenue, vendorCosts, grossMargin, platformRevenue, creatorPayouts,
			appProperties.getCommissionRate(),
			appProperties.getMarginRate(),
			activeEditions, totalUsers, totalCreators, simulatedOrders
		);
	}

	public List<AdminViews.CreatorSettlement> listCreatorSettlements() {
		requireAdmin();
		List<CreatorProfile> creators = creatorProfileRepository.findAll();
		List<CustomerOrder> allOrders = customerOrderRepository.findAllOrderByOrderedAtDesc();

		Map<Long, List<CustomerOrder>> ordersByCreatorId = allOrders.stream()
			.filter(o -> o.getStatus() == OrderStatus.PAID)
			.collect(Collectors.groupingBy(
				o -> o.getFanProject().getEditionVersion().getEdition().getCreator().getId()
			));

		return creators.stream().map(creator -> {
			List<CustomerOrder> creatorOrders = ordersByCreatorId.getOrDefault(creator.getId(), List.of());
			BigDecimal totalRevenue = BigDecimal.ZERO;
			BigDecimal vendorCost = BigDecimal.ZERO;
			BigDecimal grossMargin = BigDecimal.ZERO;
			BigDecimal platformCommission = BigDecimal.ZERO;
			BigDecimal creatorPayout = BigDecimal.ZERO;

			for (CustomerOrder order : creatorOrders) {
				totalRevenue = totalRevenue.add(order.getTotalAmount());
				vendorCost = vendorCost.add(order.getVendorCost());
				grossMargin = grossMargin.add(order.getMarginAmount());
				platformCommission = platformCommission.add(order.getPlatformFee());
				creatorPayout = creatorPayout.add(order.getCreatorPayout());
			}

			return new AdminViews.CreatorSettlement(
				creator.getId(), creator.getDisplayName(), creator.getChannelHandle(),
				creator.isVerified(), creatorOrders.size(),
				totalRevenue, vendorCost, grossMargin, platformCommission, creatorPayout
			);
		}).toList();
	}

	public List<AdminViews.OrderSummary> listAllOrders() {
		requireAdmin();
		List<CustomerOrder> orders = customerOrderRepository.findAllOrderByOrderedAtDesc();
		Map<Long, OrderRecord> recordsByProjectId = orderRecordRepository
			.findByFanProjectIdIn(orders.stream().map(o -> o.getFanProject().getId()).toList())
			.stream().collect(Collectors.toMap(r -> r.getFanProject().getId(), Function.identity()));

		return orders.stream().map(order -> {
			OrderRecord record = recordsByProjectId.get(order.getFanProject().getId());
			return new AdminViews.OrderSummary(
				order.getFanProject().getId(),
				order.getFanProject().getEditionVersion().getEdition().getId(),
				order.getFanProject().getEditionVersion().getEdition().getTitle(),
				order.getFanProject().getEditionVersion().getEdition().getCreator().getDisplayName(),
				order.getFanProject().getOwnerUser().getDisplayName(),
				order.getRecipientName(),
				order.getQuantity(),
				order.getTotalAmount(),
				order.getVendorCost(),
				order.getMarginAmount(),
				order.getPlatformFee(),
				order.getCreatorPayout(),
				order.getCommissionRate(),
				order.getMarginRate(),
				order.getOrderUid(),
				order.getStatus().name(),
				record == null ? FulfillmentStatus.PENDING_SUBMISSION.name() : record.getStatus().name(),
				record == null ? null : record.getLastEventType(),
				record == null ? null : record.getLastEventAt(),
				order.getPaymentProvider(),
				order.getPaymentMethod(),
				order.isSimulated(),
				order.getOrderedAt()
			);
		}).toList();
	}

	public List<AdminViews.WebhookEventSummary> listRecentWebhooks() {
		requireAdmin();
		List<SweetbookWebhookEvent> events = sweetbookWebhookEventRepository.findTop20ByOrderByCreatedAtDesc();
		return events.stream().map(event -> new AdminViews.WebhookEventSummary(
			event.getId(),
			event.getEventType(),
			event.getSweetbookOrderUid(),
			event.getProcessedAt(),
			event.getCreatedAt(),
			event.getSweetbookOrderUid() != null && !event.getSweetbookOrderUid().isBlank()
		)).toList();
	}

	public List<AdminViews.UserSummary> listUsers() {
		requireAdmin();
		List<AppUser> users = appUserRepository.findAll();
		Map<Long, CreatorProfile> creatorsByUserId = creatorProfileRepository.findAll().stream()
			.filter(c -> c.getUser() != null)
			.collect(Collectors.toMap(c -> c.getUser().getId(), Function.identity(), (a, b) -> a));

		return users.stream().map(user -> {
			CreatorProfile profile = creatorsByUserId.get(user.getId());
			return new AdminViews.UserSummary(
				user.getId(), user.getEmail(), user.getDisplayName(),
				user.getRole().name(), user.getCreatedAt(),
				profile == null ? null : profile.isVerified()
			);
		}).toList();
	}

	@Transactional
	public void verifyCreator(Long creatorId) {
		requireAdmin();
		CreatorProfile profile = creatorProfileRepository.findById(creatorId)
			.orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Creator not found: " + creatorId));
		profile.setVerified(true);
		creatorProfileRepository.save(profile);
	}

	private void requireAdmin() {
		currentUserService.requireCurrentAppUser(AppUserRole.ADMIN);
	}
}
