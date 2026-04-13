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
	private final ChatPersonalizationService chatPersonalizationService;
	private final CurrentUserService currentUserService;
	private final AppProperties appProperties;
	private final TossPaymentsProperties tossPaymentsProperties;

	@Transactional
	public ProjectViews.Snapshot createProject(ProjectCommands.CreateProject command) {
		AppUser currentUser = currentUserService.requireCurrentAppUser();
		Long editionId = command.editionId() == null ? editionService.getDefaultPublishedEditionId() : command.editionId();
		var publishedVersion = editionService.requirePublishedVersion(editionId);
		String mode = normalizeMode(command.mode());
		FanProject project = new FanProject();
		project.setEditionVersion(publishedVersion);
		project.setOwnerUser(currentUser);

		Map<String, Object> personalizationData = new LinkedHashMap<>();
		if ("demo".equals(mode)) {
			personalizationData.putAll(createDemoPersonalization(
				publishedVersion.getEdition().getId(),
				publishedVersion.getEdition().getCreator().getDisplayName(),
				publishedVersion.getEdition().getCreator().getChannelHandle()
			));
		}

		if (command.personalizationData() != null) {
			personalizationData.putAll(command.personalizationData());
		}
		personalizationData.put("mode", normalizeMode(asString(personalizationData.get("mode"), mode)));

		project.setPersonalizationData(personalizationData);
		project.setStatus(FanProjectStatus.DRAFT);
		project = fanProjectRepository.save(project);
		return toSnapshot(project);
	}

	private Map<String, Object> createDemoPersonalization(Long editionId, String creatorName, String creatorHandle) {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("mode", "demo");
		data.put("channel", Map.of(
			"channelId", "VC_TRINITY_ARCHIVE",
			"title", creatorName,
			"subscriberCount", "7700000",
			"thumbnailUrl", "/demo-assets/collab-trio-sunset.png",
			"bannerUrl", "/demo-assets/collab-trio-sunset.png",
			"handle", creatorHandle
		));
		data.put("uploadedImageUrl", "/demo-assets/collab-trio-sunset.png");
		data.put("topVideos", List.of(
			Map.of(
				"videoId", "collab-demo-1",
				"title", "[Vlog] 드디어 셋이 모였다! LA 사막 한가운데서 맞이한 골든아워 ✨",
				"thumbnailUrl", "/demo-assets/collab-trio-sunset.png",
				"viewCount", 1450000,
				"publishedAt", "2025-09-01T00:00:00Z"
			),
			Map.of(
				"videoId", "collab-demo-2",
				"title", "끝없는 모래바람 🏜️ 붉은 협곡에서 건진 인생샷 대방출 (feat. Astra Vale)",
				"thumbnailUrl", "/demo-assets/astra-vale-story-1.png",
				"viewCount", 980000,
				"publishedAt", "2025-09-04T00:00:00Z"
			),
			Map.of(
				"videoId", "collab-demo-3",
				"title", "도심을 가르는 시티 드라이브 🌃 밤공기 맞으며 찍은 미친 야경 (by Mina Loop)",
				"thumbnailUrl", "/demo-assets/mina-loop-story-2.png",
				"viewCount", 910000,
				"publishedAt", "2025-09-09T00:00:00Z"
			),
			Map.of(
				"videoId", "collab-demo-4",
				"title", "[Playlist] 감성 찢었다.. 🎧 조용한 스튜디오의 밤하늘을 닮은 나이트 노트 (with Noah Reed)",
				"thumbnailUrl", "/demo-assets/noah-reed-story-2.png",
				"viewCount", 870000,
				"publishedAt", "2025-09-14T00:00:00Z"
			),
			Map.of(
				"videoId", "collab-demo-5",
				"title", "아무 장비 없이 무작정 떠나본 플랫폼 🚉 셋이서 번갈아 담아본 서로의 시선",
				"thumbnailUrl", "/demo-assets/astra-vale-story-4.png",
				"viewCount", 790000,
				"publishedAt", "2025-09-20T00:00:00Z"
			),
			Map.of(
				"videoId", "collab-demo-6",
				"title", "노을 지는 해안도로 로드트립 🚙 바람 소리까지 완벽했던 힐링 모먼트",
				"thumbnailUrl", "/demo-assets/mina-loop-banner.png",
				"viewCount", 730000,
				"publishedAt", "2025-09-24T00:00:00Z"
			),
			Map.of(
				"videoId", "collab-demo-7",
				"title", "이제는 우리가 헤어져야 할 시간 🌙 창가 너머로 남겨둔 아쉬운 밤의 끝인사",
				"thumbnailUrl", "/demo-assets/noah-reed-banner.png",
				"viewCount", 710000,
				"publishedAt", "2025-09-28T00:00:00Z"
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
		personalizationData.put("mode", normalizeMode(asString(personalizationData.get("mode"), "demo")));
		project.setPersonalizationData(personalizationData);
		resetPreparedBook(project);
		project.setStatus(FanProjectStatus.PERSONALIZED);
		return toSnapshot(fanProjectRepository.save(project));
	}

	public ProjectViews.Preview getPreview(Long projectId) {
		FanProject project = requireOwnedProject(projectId);
		EditionViews.Detail edition = editionService.getEdition(project.getEditionVersion().getEdition().getId());
		ProjectViews.Preview preview = projectPreviewAssembler.assemble(toSnapshot(project), edition);
		return new ProjectViews.Preview(
			preview.projectId(),
			preview.status(),
			preview.mode(),
			preview.edition(),
			sweetbookService.getContentTemplateDetail(preview),
			preview.personalizationData(),
			preview.sweetbookBookUid(),
			preview.sweetbookExternalRef(),
			preview.sweetbookDraftCreatedAt(),
			preview.sweetbookFinalizedAt(),
			preview.pages()
		);
	}

	public ProjectViews.ChatPersonalization chatPersonalization(
		Long projectId,
		List<ProjectCommands.ChatMessage> messages
	) {
		FanProject project = requireOwnedProject(projectId);
		EditionViews.Detail edition = editionService.getEdition(project.getEditionVersion().getEdition().getId());
		return chatPersonalizationService.chat(
			edition,
			new LinkedHashMap<>(project.getPersonalizationData()),
			messages
		);
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
			OrderRecord existingFulfillmentOrder = orderRecordRepository.findByFanProjectId(projectId).orElse(null);
			if (existingOrder.getStatus() == OrderStatus.PAID && existingFulfillmentOrder == null) {
				return finalizePaidOrder(projectId, project, toShipping(existingOrder), existingOrder);
			}
			return toOrderResult(
				projectId,
				existingOrder,
				existingFulfillmentOrder,
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

	@Transactional(noRollbackFor = AppException.class)
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

		OrderRecord existingFulfillmentOrder = orderRecordRepository.findByFanProjectId(projectId).orElse(null);
		if (customerOrder.getStatus() == OrderStatus.PAID) {
			if (existingFulfillmentOrder == null) {
				return finalizePaidOrder(projectId, project, toShipping(customerOrder), customerOrder);
			}
			return toOrderResult(
				projectId,
				customerOrder,
				existingFulfillmentOrder,
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

	@Transactional
	public void deleteProject(Long projectId) {
		FanProject project = requireOwnedProject(projectId);
		CustomerOrder customerOrder = customerOrderRepository.findByFanProjectId(projectId).orElse(null);
		OrderRecord fulfillmentOrder = orderRecordRepository.findByFanProjectId(projectId).orElse(null);
		if (!isProjectDeletable(project, customerOrder, fulfillmentOrder)) {
			throw new AppException(HttpStatus.CONFLICT, "결제 또는 주문 이력이 있는 프로젝트는 삭제할 수 없습니다.");
		}

		if (customerOrder != null) {
			customerOrderRepository.delete(customerOrder);
		}
		fanProjectRepository.delete(project);
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
			resolveContinuePath(project),
			isProjectDeletable(project, customerOrder, fulfillmentOrder)
		);
	}

	private boolean isProjectDeletable(FanProject project, CustomerOrder customerOrder, OrderRecord fulfillmentOrder) {
		if (project.getStatus() == FanProjectStatus.ORDERED || fulfillmentOrder != null) {
			return false;
		}
		return customerOrder == null || customerOrder.getStatus() == OrderStatus.CREATED;
	}

	private String resolveMode(FanProject project) {
		return normalizeMode(asString(project.getPersonalizationData().get("mode"), "demo"));
	}

	private String normalizeMode(String rawMode) {
		if (rawMode == null || rawMode.isBlank()) {
			return "demo";
		}
		String normalized = rawMode.trim().toLowerCase();
		if ("youtube".equals(normalized)) {
			return "demo";
		}
		return normalized;
	}

	private String asString(Object value, String fallback) {
		return value == null ? fallback : String.valueOf(value);
	}

	private String resolveContinuePath(FanProject project) {
		return switch (project.getStatus()) {
			case DRAFT -> "/projects/" + project.getId() + "/personalize";
			case PERSONALIZED -> "/projects/" + project.getId() + "/preview";
			case BOOK_CREATED -> "/projects/" + project.getId() + "/preview";
			case FINALIZED -> "/projects/" + project.getId() + "/shipping";
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
		return "playpick-project-" + project.getId() + "-" + UUID.randomUUID();
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
		OrderRecord fulfillmentOrder;
		try {
			fulfillmentOrder = submitFulfillmentOrder(project, shipping, customerOrder, orderedAt);
		} catch (AppException exception) {
			throw new AppException(
				HttpStatus.BAD_GATEWAY,
				"Sweetbook 주문 접수에 실패했습니다. 프로젝트를 주문 완료로 표시하지 않았습니다. 잠시 후 다시 시도해 주세요.",
				exception
			);
		}
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
