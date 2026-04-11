package com.playpick.application;

import com.playpick.config.AppProperties;
import com.playpick.config.TossPaymentsProperties;
import com.playpick.domain.AppUser;
import com.playpick.domain.CustomerOrder;
import com.playpick.domain.CustomerOrderRepository;
import com.playpick.domain.FanProject;
import com.playpick.domain.FanProjectRepository;
import com.playpick.domain.FanProjectStatus;
import com.playpick.domain.FulfillmentStatus;
import com.playpick.domain.OrderRecord;
import com.playpick.domain.OrderRecordRepository;
import com.playpick.domain.OrderStatus;
import com.playpick.security.CurrentUserService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {

	private final EditionService editionService;
	private final FanProjectRepository fanProjectRepository;
	private final CustomerOrderRepository customerOrderRepository;
	private final OrderRecordRepository orderRecordRepository;
	private final ProjectPreviewAssembler projectPreviewAssembler;
	private final SweetbookService sweetbookService;
	private final TossPaymentsService tossPaymentsService;
	private final OpenRouterImageService openRouterImageService;
	private final CurrentUserService currentUserService;
	private final AppProperties appProperties;
	private final TossPaymentsProperties tossPaymentsProperties;

	@Transactional
	public ProjectViews.Snapshot createProject(ProjectCommands.CreateProject command) {
		AppUser currentUser = currentUserService.requireCurrentAppUser();
		Long editionId = command.editionId() == null ? editionService.getDefaultPublishedEditionId() : command.editionId();
		var publishedVersion = editionService.requirePublishedVersion(editionId);
		FanProject project = new FanProject();
		project.setEditionVersion(publishedVersion);
		project.setOwnerUser(currentUser);

		Map<String, Object> personalizationData = new LinkedHashMap<>();
		if ("demo".equalsIgnoreCase(command.mode()) || command.mode() == null || command.mode().isBlank()) {
			personalizationData.putAll(createDemoPersonalization(
				publishedVersion.getEdition().getId(),
				publishedVersion.getEdition().getCreator().getDisplayName(),
				publishedVersion.getEdition().getCreator().getChannelHandle()
			));
		}

		if (command.personalizationData() != null) {
			personalizationData.putAll(command.personalizationData());
		}
		personalizationData.putIfAbsent("mode", command.mode() == null || command.mode().isBlank() ? "demo" : command.mode());

		project.setPersonalizationData(personalizationData);
		project.setStatus(FanProjectStatus.DRAFT);
		project = fanProjectRepository.save(project);
		return toSnapshot(project);
	}

	private Map<String, Object> createDemoPersonalization(Long editionId, String creatorName, String creatorHandle) {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("mode", "demo");
		if (editionId == 1L) {
			data.put("fanNickname", "연두");
			data.put("subscribedSince", "2023-07-14T00:00:00Z");
			data.put("daysTogether", 1002);
			data.put("favoriteVideoId", "pani-demo-2");
			data.put("uploadedImageUrl", "/demo-assets/panibottle-landscape.jpg");
			data.put("fanNote", "밤기차 창밖이 까맣게 흘러가는데도 계속 말을 이어가던 장면이 이상하게 오래 남았어요. 언젠가 저도 그런 식으로 낯선 도시를 건너보고 싶어요.");
			data.put("channel", Map.of(
				"channelId", "UC_DEMO_PANIBOTTLE",
				"title", creatorName,
				"subscriberCount", "2500000",
				"thumbnailUrl", "/demo-assets/panibottle-avatar.jpg",
				"bannerUrl", "/demo-assets/panibottle-landscape.jpg",
				"handle", creatorHandle
			));
			data.put("topVideos", List.of(
				Map.of(
					"videoId", "pani-demo-1",
					"title", "처음 내려본 사막 도시의 오후",
					"thumbnailUrl", "/demo-assets/panibottle-cover.jpg",
					"viewCount", 630000,
					"publishedAt", "2024-06-01T00:00:00Z"
				),
				Map.of(
					"videoId", "pani-demo-2",
					"title", "야간열차 타고 국경 넘기",
					"thumbnailUrl", "/demo-assets/panibottle-landscape.jpg",
					"viewCount", 520000,
					"publishedAt", "2024-10-01T00:00:00Z"
				),
				Map.of(
					"videoId", "pani-demo-3",
					"title", "로컬 야시장 한 바퀴",
					"thumbnailUrl", "/demo-assets/panibottle-landscape.jpg",
					"viewCount", 410000,
					"publishedAt", "2025-01-01T00:00:00Z"
				)
			));
			return data;
		}

		if (editionId == 2L) {
			data.put("fanNickname", "소연");
			data.put("favoriteMemory", "처음 보는 골목에서 멈칫하다가도 결국 웃으면서 들어가던 장면이 제일 곽튜브답다고 느꼈어요.");
			data.put("fanMessage", "영상 속 어색함이 오히려 용기가 되는 순간이 있더라고요. 이 북에는 그때마다 저장해 두고 싶었던 문장들을 편지처럼 모아보고 싶어요.");
			data.put("channel", Map.of(
				"channelId", "UC_DEMO_JBKWAK",
				"title", creatorName,
				"subscriberCount", "2100000",
				"thumbnailUrl", "/demo-assets/jbkwak-avatar.jpg",
				"bannerUrl", "/demo-assets/jbkwak-landscape.jpg",
				"handle", creatorHandle
			));
			return data;
		}

		data.put("fanNickname", "주은");
		data.put("favoriteVideoId", "chim-demo-2");
		data.put("uploadedImageUrl", "/demo-assets/chimchakman-landscape.jpg");
		data.put("fanNote", "말이 빙 돌아가다가도 마지막에 툭 정리되는 순간이 좋아요. 웃다가도 메모하고 싶어지는 장면들만 따로 접어두고 싶었습니다.");
		data.put("channel", Map.of(
			"channelId", "UC_DEMO_CHIMCHAKMAN",
			"title", creatorName,
			"subscriberCount", "3100000",
			"thumbnailUrl", "/demo-assets/chimchakman-avatar.jpg",
			"bannerUrl", "/demo-assets/chimchakman-landscape.jpg",
			"handle", creatorHandle
		));
		data.put("topVideos", List.of(
			Map.of(
				"videoId", "chim-demo-1",
				"title", "괜히 다시 켜보게 되는 토크",
				"thumbnailUrl", "/demo-assets/chimchakman-cover.jpg",
				"viewCount", 980000,
				"publishedAt", "2024-05-01T00:00:00Z"
			),
			Map.of(
				"videoId", "chim-demo-2",
				"title", "먹방과 잡담 하이라이트",
				"thumbnailUrl", "/demo-assets/chimchakman-landscape.jpg",
				"viewCount", 870000,
				"publishedAt", "2024-11-01T00:00:00Z"
			),
			Map.of(
				"videoId", "chim-demo-3",
				"title", "팬이 자주 꺼내보는 하이라이트",
				"thumbnailUrl", "/demo-assets/chimchakman-landscape.jpg",
				"viewCount", 790000,
				"publishedAt", "2025-02-01T00:00:00Z"
			)
		));
		return data;
	}

	@Transactional
	public ProjectViews.Snapshot updateProject(Long projectId, ProjectCommands.UpdateProject command) {
		FanProject project = requireOwnedProject(projectId);
		if (project.getStatus() == FanProjectStatus.ORDERED) {
			throw new AppException(HttpStatus.CONFLICT, "Ordered projects can no longer be edited");
		}

		Map<String, Object> personalizationData = new LinkedHashMap<>(project.getPersonalizationData());
		if (command.personalizationData() != null) {
			personalizationData.putAll(command.personalizationData());
		}
		project.setPersonalizationData(personalizationData);
		resetPreparedBook(project);
		project.setStatus(FanProjectStatus.PERSONALIZED);
		return toSnapshot(fanProjectRepository.save(project));
	}

	public ProjectViews.Preview getPreview(Long projectId) {
		FanProject project = requireOwnedProject(projectId);
		EditionViews.Detail edition = editionService.getEdition(project.getEditionVersion().getEdition().getId());
		return projectPreviewAssembler.assemble(toSnapshot(project), edition);
	}

	public ProjectViews.AiCollabGeneration generateAiCollab(Long projectId, ProjectCommands.GenerateAiCollab command) {
		FanProject project = requireOwnedProject(projectId);
		Long editionId = project.getEditionVersion().getEdition().getId();
		if (editionId != 1L) {
			throw new AppException(HttpStatus.BAD_REQUEST, "AI collab is only enabled for the PaniBottle edition");
		}
		return openRouterImageService.generatePaniCollab(command);
	}

	@Transactional
	public ProjectViews.BookGeneration generateBook(Long projectId) {
		FanProject project = requireOwnedProject(projectId);
		if (project.getStatus() == FanProjectStatus.ORDERED) {
			throw new AppException(HttpStatus.CONFLICT, "This project has already been ordered");
		}
		ProjectViews.Preview preview = getPreview(projectId);
		if (project.getSweetbookBookUid() != null
			&& !project.getSweetbookBookUid().isBlank()
			&& project.getStatus() == FanProjectStatus.BOOK_CREATED) {
			return toBookGeneration(project, preview, "DRAFT", "BOOK_CREATED", true);
		}
		if (project.getSweetbookBookUid() != null
			&& !project.getSweetbookBookUid().isBlank()
			&& project.getStatus() == FanProjectStatus.FINALIZED) {
			return toBookGeneration(project, preview, "FINALIZED", "FINALIZED", true);
		}

		String externalRef = buildSweetbookExternalRef(project);
		ProjectViews.BookGeneration generation = sweetbookService.prepareBookDraft(
			preview,
			externalRef,
			buildDraftIdempotencyKey(project, externalRef),
			false
		);
		project.setSweetbookExternalRef(externalRef);
		project.setSweetbookBookUid(generation.bookUid());
		project.setSweetbookDraftCreatedAt(Instant.now());
		project.setSweetbookFinalizedAt(null);
		project.setStatus(FanProjectStatus.BOOK_CREATED);
		fanProjectRepository.save(project);
		return generation;
	}

	@Transactional
	public ProjectViews.BookGeneration finalizeBook(Long projectId) {
		FanProject project = requireOwnedProject(projectId);
		if (project.getStatus() == FanProjectStatus.ORDERED) {
			return toBookGeneration(project, getPreview(projectId), "FINALIZED", "FINALIZED", true);
		}
		if (project.getSweetbookBookUid() == null || project.getSweetbookBookUid().isBlank()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Create the Sweetbook draft before finalizing");
		}

		ProjectViews.Preview preview = getPreview(projectId);
		if (project.getStatus() == FanProjectStatus.FINALIZED) {
			return toBookGeneration(project, preview, "FINALIZED", "FINALIZED", true);
		}

		ProjectViews.BookGeneration generation = sweetbookService.finalizeBook(preview, project.getSweetbookBookUid(), false);
		project.setSweetbookFinalizedAt(Instant.now());
		project.setStatus(FanProjectStatus.FINALIZED);
		fanProjectRepository.save(project);
		return generation;
	}

	public ProjectViews.Estimate estimate(Long projectId, ProjectCommands.Shipping shipping) {
		FanProject project = requireOwnedProject(projectId);
		requireFinalizedBook(project);
		return toPricedEstimate(sweetbookService.estimateOrder(projectId, project.getSweetbookBookUid(), shipping));
	}

	@Transactional
	public ProjectViews.PaymentSession preparePayment(Long projectId, ProjectCommands.Shipping shipping) {
		FanProject project = requireOwnedProject(projectId);
		requireFinalizedBook(project);
		if (!tossPaymentsProperties.isReady()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Toss Payments is not configured");
		}

		CustomerOrder existingOrder = customerOrderRepository.findByFanProjectId(projectId).orElse(null);
		if (existingOrder != null && existingOrder.getStatus() == OrderStatus.PAID) {
			throw new AppException(HttpStatus.CONFLICT, "Order already completed for this project");
		}

		ProjectViews.Estimate vendorEstimate = sweetbookService.estimateOrder(projectId, project.getSweetbookBookUid(), shipping);
		OrderPricing pricing = calculatePricing(vendorEstimate.totalAmount());
		AppUser currentUser = currentUserService.requireCurrentAppUser();
		CustomerOrder customerOrder = existingOrder == null ? new CustomerOrder() : existingOrder;
		customerOrder.setFanProject(project);
		customerOrder.setOrderUid(newSiteOrderUid());
		customerOrder.setStatus(OrderStatus.CREATED);
		customerOrder.setSimulated(vendorEstimate.simulated());
		customerOrder.setRecipientName(shipping.recipientName());
		customerOrder.setRecipientPhone(shipping.recipientPhone());
		customerOrder.setPostalCode(shipping.postalCode());
		customerOrder.setAddress1(shipping.address1());
		customerOrder.setAddress2(shipping.address2());
		customerOrder.setQuantity(Math.max(shipping.quantity(), 1));
		customerOrder.setPaymentProvider(null);
		customerOrder.setPaymentKey(null);
		customerOrder.setPaymentMethod(null);
		customerOrder.setPaymentApprovedAt(null);
		customerOrder.setOrderedAt(Instant.now());
		applyPricing(customerOrder, pricing);
		customerOrder = customerOrderRepository.save(customerOrder);

		return new ProjectViews.PaymentSession(
			projectId,
			"TOSS_PAYMENTS",
			true,
			tossPaymentsProperties.getClientKey(),
			customerOrder.getOrderUid(),
			customerOrder.getOrderUid(),
			buildOrderName(project, shipping),
			customerOrder.getTotalAmount(),
			currentUser.getDisplayName(),
			currentUser.getEmail(),
			sanitizePhone(shipping.recipientPhone()),
			appProperties.getFrontendBaseUrl() + "/projects/" + projectId + "/payment/success",
			appProperties.getFrontendBaseUrl() + "/projects/" + projectId + "/payment/fail"
		);
	}

	@Transactional
	public ProjectViews.OrderResult order(Long projectId, ProjectCommands.Shipping shipping) {
		FanProject project = requireOwnedProject(projectId);
		requireFinalizedBook(project);
		if (tossPaymentsProperties.isReady()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Use payment confirmation flow when Toss Payments is enabled");
		}

		CustomerOrder existingOrder = customerOrderRepository.findByFanProjectId(projectId).orElse(null);
		if (existingOrder != null) {
			return toOrderResult(
				projectId,
				existingOrder,
				orderRecordRepository.findByFanProjectId(projectId).orElse(null),
				Map.of("reused", true)
			);
		}

		ProjectViews.Estimate vendorEstimate = sweetbookService.estimateOrder(projectId, project.getSweetbookBookUid(), shipping);
		OrderPricing pricing = calculatePricing(vendorEstimate.totalAmount());
		Instant orderedAt = Instant.now();

		CustomerOrder customerOrder = new CustomerOrder();
		customerOrder.setFanProject(project);
		customerOrder.setOrderUid(newSiteOrderUid());
		customerOrder.setStatus(OrderStatus.PAID);
		customerOrder.setSimulated(vendorEstimate.simulated());
		customerOrder.setRecipientName(shipping.recipientName());
		customerOrder.setRecipientPhone(shipping.recipientPhone());
		customerOrder.setPostalCode(shipping.postalCode());
		customerOrder.setAddress1(shipping.address1());
		customerOrder.setAddress2(shipping.address2());
		customerOrder.setQuantity(Math.max(shipping.quantity(), 1));
		customerOrder.setOrderedAt(orderedAt);
		applyPricing(customerOrder, pricing);
		customerOrder = customerOrderRepository.save(customerOrder);

		return finalizePaidOrder(projectId, project, shipping, customerOrder);
	}

	@Transactional
	public ProjectViews.OrderResult confirmPayment(Long projectId, ProjectCommands.PaymentConfirmation confirmation) {
		FanProject project = requireOwnedProject(projectId);
		requireFinalizedBook(project);
		if (!tossPaymentsProperties.isReady()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Toss Payments is not configured");
		}

		CustomerOrder customerOrder = customerOrderRepository.findByFanProjectId(projectId)
			.orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Pending payment not found for project: " + projectId));

		if (!customerOrder.getOrderUid().equals(confirmation.orderId())) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Payment order does not match the pending project order");
		}

		if (customerOrder.getStatus() == OrderStatus.PAID) {
			return toOrderResult(
				projectId,
				customerOrder,
				orderRecordRepository.findByFanProjectId(projectId).orElse(null),
				Map.of("reused", true)
			);
		}

		BigDecimal requestedAmount = BigDecimal.valueOf(confirmation.amount());
		if (customerOrder.getTotalAmount().compareTo(requestedAmount) != 0) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Payment amount does not match the prepared order amount");
		}

		TossPaymentsService.ConfirmedPayment confirmedPayment = tossPaymentsService.confirm(confirmation);
		if (!customerOrder.getOrderUid().equals(confirmedPayment.orderId())) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Confirmed payment order does not match the prepared order");
		}
		if (customerOrder.getTotalAmount().compareTo(confirmedPayment.totalAmount()) != 0) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Confirmed payment amount does not match the prepared order");
		}

		customerOrder.setStatus(OrderStatus.PAID);
		customerOrder.setPaymentProvider("TOSS_PAYMENTS");
		customerOrder.setPaymentKey(confirmedPayment.paymentKey());
		customerOrder.setPaymentMethod(confirmedPayment.method());
		customerOrder.setPaymentApprovedAt(confirmedPayment.approvedAt() == null ? Instant.now() : confirmedPayment.approvedAt());
		customerOrder.setOrderedAt(customerOrder.getPaymentApprovedAt());
		if (customerOrder.getVendorCost() == null || customerOrder.getVendorCost().compareTo(BigDecimal.ZERO) <= 0) {
			applyPricing(customerOrder, calculatePricing(customerOrder.getTotalAmount()));
		}
		customerOrder = customerOrderRepository.save(customerOrder);

		return finalizePaidOrder(projectId, project, toShipping(customerOrder), customerOrder);
	}

	public ProjectViews.OrderSummary getOrderSummary(Long projectId) {
		FanProject project = requireOwnedProject(projectId);
		CustomerOrder customerOrder = customerOrderRepository.findByFanProjectId(projectId)
			.orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Order not found for project: " + projectId));
		OrderRecord orderRecord = orderRecordRepository.findByFanProjectId(projectId).orElse(null);
		EditionViews.Detail edition = editionService.getEdition(project.getEditionVersion().getEdition().getId());

		return new ProjectViews.OrderSummary(
			projectId,
			project.getStatus().name(),
			customerOrder.getStatus().name(),
			customerOrder.getOrderUid(),
			resolveFulfillmentStatus(orderRecord),
			orderRecord == null ? null : orderRecord.getSweetbookOrderUid(),
			orderRecord == null ? null : orderRecord.getLastEventType(),
			orderRecord == null ? null : orderRecord.getLastEventAt(),
			customerOrder.getTotalAmount(),
			customerOrder.isSimulated(),
			customerOrder.getOrderedAt(),
			new ProjectViews.OrderShipping(
				customerOrder.getRecipientName(),
				customerOrder.getRecipientPhone(),
				customerOrder.getPostalCode(),
				customerOrder.getAddress1(),
				customerOrder.getAddress2()
			),
			new ProjectViews.OrderEdition(
				edition.id(),
				edition.title(),
				edition.creator()
			)
		);
	}

	public List<ProjectViews.MyProjectSummary> listMyProjects() {
		AppUser currentUser = currentUserService.requireCurrentAppUser();
		return fanProjectRepository.findByOwnerUserIdOrderByUpdatedAtDesc(currentUser.getId()).stream()
			.map(this::toMyProjectSummary)
			.toList();
	}

	private FanProject requireProject(Long projectId) {
		return fanProjectRepository.findById(projectId)
			.orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Project not found: " + projectId));
	}

	private FanProject requireOwnedProject(Long projectId) {
		AppUser currentUser = currentUserService.requireCurrentAppUser();
		FanProject project = requireProject(projectId);
		if (!project.getOwnerUser().getId().equals(currentUser.getId())) {
			throw new AppException(HttpStatus.FORBIDDEN, "You do not have access to this project");
		}
		return project;
	}

	private ProjectViews.Snapshot toSnapshot(FanProject project) {
		return new ProjectViews.Snapshot(
			project.getId(),
			project.getEditionVersion().getEdition().getId(),
			project.getEditionVersion().getId(),
			project.getStatus().name(),
			new LinkedHashMap<>(project.getPersonalizationData()),
			project.getSweetbookBookUid(),
			project.getSweetbookExternalRef(),
			project.getSweetbookDraftCreatedAt(),
			project.getSweetbookFinalizedAt(),
			project.getCreatedAt(),
			project.getUpdatedAt()
		);
	}

	private ProjectViews.MyProjectSummary toMyProjectSummary(FanProject project) {
		CustomerOrder customerOrder = customerOrderRepository.findByFanProjectId(project.getId()).orElse(null);
		OrderRecord fulfillmentOrder = orderRecordRepository.findByFanProjectId(project.getId()).orElse(null);

		return new ProjectViews.MyProjectSummary(
			project.getId(),
			project.getEditionVersion().getEdition().getId(),
			project.getEditionVersion().getEdition().getTitle(),
			project.getEditionVersion().getEdition().getCoverImageUrl(),
			project.getStatus().name(),
			resolveMode(project),
			customerOrder == null ? null : customerOrder.getStatus().name(),
			resolveFulfillmentStatus(fulfillmentOrder),
			fulfillmentOrder == null ? null : fulfillmentOrder.getLastEventType(),
			fulfillmentOrder == null ? null : fulfillmentOrder.getLastEventAt(),
			project.getUpdatedAt(),
			resolveContinuePath(project)
		);
	}

	private String resolveMode(FanProject project) {
		Object mode = project.getPersonalizationData().get("mode");
		if (mode instanceof String text && !text.isBlank()) {
			return text;
		}
		return "demo";
	}

	private String resolveContinuePath(FanProject project) {
		return switch (project.getStatus()) {
			case DRAFT -> "/projects/" + project.getId() + "/personalize";
			case PERSONALIZED -> "/projects/" + project.getId() + "/preview";
			case BOOK_CREATED, FINALIZED -> "/projects/" + project.getId() + "/shipping";
			case ORDERED -> "/projects/" + project.getId() + "/complete";
		};
	}

	private void requireFinalizedBook(FanProject project) {
		if (project.getSweetbookBookUid() == null || project.getSweetbookBookUid().isBlank()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Create the Sweetbook draft before continuing");
		}
		if (project.getStatus() != FanProjectStatus.FINALIZED && project.getStatus() != FanProjectStatus.ORDERED) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Finalize the Sweetbook book before continuing");
		}
	}

	private String newSiteOrderUid() {
		return "site-order-" + UUID.randomUUID();
	}

	private String buildSweetbookExternalRef(FanProject project) {
		long revisionSeed = project.getUpdatedAt() == null ? Instant.now().toEpochMilli() : project.getUpdatedAt().toEpochMilli();
		return "playpick-project-" + project.getId() + "-" + revisionSeed;
	}

	private String buildDraftIdempotencyKey(FanProject project, String externalRef) {
		return externalRef + "-v" + project.getEditionVersion().getId();
	}

	private String buildOrderName(FanProject project, ProjectCommands.Shipping shipping) {
		String title = project.getEditionVersion().getEdition().getTitle();
		int quantity = Math.max(shipping.quantity(), 1);
		return quantity == 1 ? title : title + " " + quantity + "권";
	}

	private String sanitizePhone(String phone) {
		if (phone == null) {
			return "";
		}
		return phone.replaceAll("[^0-9]", "");
	}

	private ProjectCommands.Shipping toShipping(CustomerOrder customerOrder) {
		return new ProjectCommands.Shipping(
			customerOrder.getRecipientName(),
			customerOrder.getRecipientPhone(),
			customerOrder.getPostalCode(),
			customerOrder.getAddress1(),
			customerOrder.getAddress2(),
			customerOrder.getQuantity()
		);
	}

	private ProjectViews.OrderResult finalizePaidOrder(
		Long projectId,
		FanProject project,
		ProjectCommands.Shipping shipping,
		CustomerOrder customerOrder
	) {
		Instant orderedAt = customerOrder.getOrderedAt() == null ? Instant.now() : customerOrder.getOrderedAt();
		OrderRecord fulfillmentOrder = submitFulfillmentOrder(project, shipping, customerOrder, orderedAt);
		if (fulfillmentOrder != null && fulfillmentOrder.getStatus() == FulfillmentStatus.SIMULATED && !customerOrder.isSimulated()) {
			customerOrder.setSimulated(true);
			customerOrder = customerOrderRepository.save(customerOrder);
		}

		project.setStatus(FanProjectStatus.ORDERED);
		fanProjectRepository.save(project);
		return toOrderResult(projectId, customerOrder, fulfillmentOrder, Map.of());
	}

	private OrderRecord submitFulfillmentOrder(
		FanProject project,
		ProjectCommands.Shipping shipping,
		CustomerOrder customerOrder,
		Instant orderedAt
	) {
		try {
			ProjectViews.FulfillmentResult result = sweetbookService.createOrder(project.getId(), project.getSweetbookBookUid(), shipping);

			OrderRecord orderRecord = new OrderRecord();
			orderRecord.setFanProject(project);
			orderRecord.setSweetbookOrderUid(result.orderUid());
			orderRecord.setStatus(toFulfillmentStatus(result));
			orderRecord.setTotalAmount(customerOrder.getTotalAmount());
			orderRecord.setRecipientName(customerOrder.getRecipientName());
			orderRecord.setRecipientPhone(customerOrder.getRecipientPhone());
			orderRecord.setPostalCode(customerOrder.getPostalCode());
			orderRecord.setAddress1(customerOrder.getAddress1());
			orderRecord.setAddress2(customerOrder.getAddress2());
			orderRecord.setOrderedAt(orderedAt);
			orderRecord.setLastEventType(result.simulated() ? "simulation.ready" : "order.created");
			orderRecord.setLastEventAt(Instant.now());
			return orderRecordRepository.save(orderRecord);
		} catch (RuntimeException exception) {
			return null;
		}
	}

	private FulfillmentStatus toFulfillmentStatus(ProjectViews.FulfillmentResult result) {
		if (result.simulated()) {
			return FulfillmentStatus.SIMULATED;
		}
		return switch (result.status()) {
			case "CANCELLED" -> FulfillmentStatus.CANCELLED;
			case "FAILED" -> FulfillmentStatus.FAILED;
			default -> FulfillmentStatus.SUBMITTED;
		};
	}

	private String resolveFulfillmentStatus(OrderRecord orderRecord) {
		return orderRecord == null ? FulfillmentStatus.PENDING_SUBMISSION.name() : orderRecord.getStatus().name();
	}

	private ProjectViews.OrderResult toOrderResult(
		Long projectId,
		CustomerOrder customerOrder,
		OrderRecord fulfillmentOrder,
		Map<String, Object> raw
	) {
		return new ProjectViews.OrderResult(
			projectId,
			customerOrder.getOrderUid(),
			customerOrder.getStatus().name(),
			fulfillmentOrder == null ? null : fulfillmentOrder.getSweetbookOrderUid(),
			resolveFulfillmentStatus(fulfillmentOrder),
			customerOrder.getTotalAmount(),
			customerOrder.isSimulated(),
			raw
		);
	}

	private void resetPreparedBook(FanProject project) {
		if (project.getSweetbookBookUid() == null || project.getSweetbookBookUid().isBlank()) {
			return;
		}
		project.setSweetbookBookUid(null);
		project.setSweetbookExternalRef(null);
		project.setSweetbookDraftCreatedAt(null);
		project.setSweetbookFinalizedAt(null);
	}

	private ProjectViews.BookGeneration toBookGeneration(
		FanProject project,
		ProjectViews.Preview preview,
		String sweetbookStatus,
		String projectStatus,
		boolean reused
	) {
		return sweetbookService.describeBook(
			preview,
			project.getSweetbookBookUid(),
			sweetbookStatus,
			projectStatus,
			isSimulatedBook(project.getSweetbookBookUid()),
			reused
		);
	}

	private ProjectViews.Estimate toPricedEstimate(ProjectViews.Estimate vendorEstimate) {
		OrderPricing pricing = calculatePricing(vendorEstimate.totalAmount());
		return new ProjectViews.Estimate(
			vendorEstimate.projectId(),
			vendorEstimate.currency(),
			pricing.totalAmount(),
			pricing.vendorCost(),
			vendorEstimate.shippingFee(),
			pricing.marginAmount(),
			pricing.platformFee(),
			pricing.creatorPayout(),
			vendorEstimate.simulated(),
			vendorEstimate.raw()
		);
	}

	private void applyPricing(CustomerOrder customerOrder, OrderPricing pricing) {
		customerOrder.setVendorCost(pricing.vendorCost());
		customerOrder.setMarginRate(pricing.marginRate());
		customerOrder.setMarginAmount(pricing.marginAmount());
		customerOrder.setCommissionRate(pricing.commissionRate());
		customerOrder.setPlatformFee(pricing.platformFee());
		customerOrder.setCreatorPayout(pricing.creatorPayout());
		customerOrder.setTotalAmount(pricing.totalAmount());
	}

	private OrderPricing calculatePricing(BigDecimal rawVendorCost) {
		BigDecimal vendorCost = normalizeMoney(rawVendorCost);
		BigDecimal marginRate = normalizeMarginRate(appProperties.getMarginRate());
		BigDecimal commissionRate = normalizeRatio(appProperties.getCommissionRate());
		BigDecimal marginAmount = vendorCost.multiply(marginRate).setScale(2, RoundingMode.HALF_UP);
		BigDecimal platformFee = marginAmount.multiply(commissionRate).setScale(2, RoundingMode.HALF_UP);
		BigDecimal creatorPayout = marginAmount.subtract(platformFee).setScale(2, RoundingMode.HALF_UP);
		BigDecimal totalAmount = vendorCost.add(marginAmount).setScale(2, RoundingMode.HALF_UP);
		return new OrderPricing(vendorCost, marginRate, marginAmount, commissionRate, platformFee, creatorPayout, totalAmount);
	}

	private BigDecimal normalizeMoney(BigDecimal value) {
		if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
			return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		}
		return value.setScale(2, RoundingMode.HALF_UP);
	}

	private BigDecimal normalizeMarginRate(BigDecimal value) {
		if (value == null || value.compareTo(BigDecimal.ZERO) < 0) {
			return new BigDecimal("0.3500");
		}
		return value.setScale(4, RoundingMode.HALF_UP);
	}

	private BigDecimal normalizeRatio(BigDecimal value) {
		if (value == null) {
			return new BigDecimal("0.2000");
		}
		if (value.compareTo(BigDecimal.ZERO) < 0) {
			return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
		}
		if (value.compareTo(BigDecimal.ONE) > 0) {
			return BigDecimal.ONE.setScale(4, RoundingMode.HALF_UP);
		}
		return value.setScale(4, RoundingMode.HALF_UP);
	}

	private boolean isSimulatedBook(String bookUid) {
		return bookUid != null && bookUid.startsWith("demo-book-");
	}

	private record OrderPricing(
		BigDecimal vendorCost,
		BigDecimal marginRate,
		BigDecimal marginAmount,
		BigDecimal commissionRate,
		BigDecimal platformFee,
		BigDecimal creatorPayout,
		BigDecimal totalAmount
	) {
	}
}
