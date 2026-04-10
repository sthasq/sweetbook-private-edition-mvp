package com.privateedition.application;

import com.privateedition.domain.AppUser;
import com.privateedition.domain.CustomerOrder;
import com.privateedition.domain.CustomerOrderRepository;
import com.privateedition.domain.FanProject;
import com.privateedition.domain.FanProjectRepository;
import com.privateedition.domain.FanProjectStatus;
import com.privateedition.domain.FulfillmentStatus;
import com.privateedition.domain.OrderRecord;
import com.privateedition.domain.OrderRecordRepository;
import com.privateedition.domain.OrderStatus;
import com.privateedition.security.CurrentUserService;
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
	private final CurrentUserService currentUserService;

	@Transactional
	public ProjectViews.Snapshot createProject(ProjectCommands.CreateProject command) {
		AppUser currentUser = currentUserService.requireCurrentAppUser();
		Long editionId = command.editionId() == null ? editionService.getDefaultPublishedEditionId() : command.editionId();
		FanProject project = new FanProject();
		project.setEditionVersion(editionService.requirePublishedVersion(editionId));
		project.setOwnerUser(currentUser);

		Map<String, Object> personalizationData = new LinkedHashMap<>();
		if ("demo".equalsIgnoreCase(command.mode()) || command.mode() == null || command.mode().isBlank()) {
			personalizationData.putAll(createDemoPersonalization());
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

	private Map<String, Object> createDemoPersonalization() {
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("mode", "demo");
		data.put("fanNickname", "Fan");
		data.put("subscribedSince", "2024-01-01T00:00:00Z");
		data.put("daysTogether", 365);
		data.put("favoriteVideoId", "demo-video-1");
		data.put("fanNote", "");
		data.put("channel", Map.of(
			"channelId", "UC_DEMO_CREATOR",
			"title", "Demo Creator",
			"subscriberCount", "100000",
			"thumbnailUrl", "https://picsum.photos/seed/demo-ch/600/600",
			"bannerUrl", "https://picsum.photos/seed/demo-banner/1600/500"
		));
		data.put("topVideos", List.of(
			Map.of(
				"videoId", "demo-video-1",
				"title", "Top Highlights Vol. 1",
				"thumbnailUrl", "https://picsum.photos/seed/demo-v1/1280/720",
				"viewCount", 100000,
				"publishedAt", "2023-06-01T00:00:00Z"
			),
			Map.of(
				"videoId", "demo-video-2",
				"title", "Anniversary Live Recap",
				"thumbnailUrl", "https://picsum.photos/seed/demo-v2/1280/720",
				"viewCount", 85000,
				"publishedAt", "2024-01-01T00:00:00Z"
			),
			Map.of(
				"videoId", "demo-video-3",
				"title", "Behind the Scenes",
				"thumbnailUrl", "https://picsum.photos/seed/demo-v3/1280/720",
				"viewCount", 45000,
				"publishedAt", "2024-03-01T00:00:00Z"
			)
		));
		return data;
	}

	@Transactional
	public ProjectViews.Snapshot updateProject(Long projectId, ProjectCommands.UpdateProject command) {
		FanProject project = requireOwnedProject(projectId);
		Map<String, Object> personalizationData = new LinkedHashMap<>(project.getPersonalizationData());
		if (command.personalizationData() != null) {
			personalizationData.putAll(command.personalizationData());
		}
		project.setPersonalizationData(personalizationData);
		project.setStatus(FanProjectStatus.PERSONALIZED);
		return toSnapshot(fanProjectRepository.save(project));
	}

	public ProjectViews.Preview getPreview(Long projectId) {
		FanProject project = requireOwnedProject(projectId);
		EditionViews.Detail edition = editionService.getEdition(project.getEditionVersion().getEdition().getId());
		return projectPreviewAssembler.assemble(toSnapshot(project), edition);
	}

	@Transactional
	public ProjectViews.BookGeneration generateBook(Long projectId) {
		FanProject project = requireOwnedProject(projectId);
		ProjectViews.Preview preview = getPreview(projectId);
		ProjectViews.BookGeneration generation = sweetbookService.generateBook(preview);
		project.setSweetbookBookUid(generation.bookUid());
		project.setStatus(FanProjectStatus.FINALIZED);
		fanProjectRepository.save(project);
		return generation;
	}

	public ProjectViews.Estimate estimate(Long projectId, ProjectCommands.Shipping shipping) {
		FanProject project = requireOwnedProject(projectId);
		if (project.getSweetbookBookUid() == null || project.getSweetbookBookUid().isBlank()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Generate the Sweetbook book before requesting an estimate");
		}
		return sweetbookService.estimateOrder(projectId, project.getSweetbookBookUid(), shipping);
	}

	@Transactional
	public ProjectViews.OrderResult order(Long projectId, ProjectCommands.Shipping shipping) {
		FanProject project = requireOwnedProject(projectId);
		if (project.getSweetbookBookUid() == null || project.getSweetbookBookUid().isBlank()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Generate the Sweetbook book before ordering");
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

		ProjectViews.Estimate estimate = sweetbookService.estimateOrder(projectId, project.getSweetbookBookUid(), shipping);
		Instant orderedAt = Instant.now();

		CustomerOrder customerOrder = new CustomerOrder();
		customerOrder.setFanProject(project);
		customerOrder.setOrderUid("site-order-" + UUID.randomUUID());
		customerOrder.setStatus(OrderStatus.PAID);
		customerOrder.setTotalAmount(estimate.totalAmount());
		customerOrder.setSimulated(estimate.simulated());
		customerOrder.setRecipientName(shipping.recipientName());
		customerOrder.setRecipientPhone(shipping.recipientPhone());
		customerOrder.setPostalCode(shipping.postalCode());
		customerOrder.setAddress1(shipping.address1());
		customerOrder.setAddress2(shipping.address2());
		customerOrder.setOrderedAt(orderedAt);
		customerOrder = customerOrderRepository.save(customerOrder);

		OrderRecord fulfillmentOrder = submitFulfillmentOrder(project, shipping, customerOrder, orderedAt);
		if (fulfillmentOrder != null && fulfillmentOrder.getStatus() == FulfillmentStatus.SIMULATED && !customerOrder.isSimulated()) {
			customerOrder.setSimulated(true);
			customerOrder = customerOrderRepository.save(customerOrder);
		}

		project.setStatus(FanProjectStatus.ORDERED);
		fanProjectRepository.save(project);
		return toOrderResult(projectId, customerOrder, fulfillmentOrder, Map.of());
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
			project.getStatus().name(),
			resolveMode(project),
			customerOrder == null ? null : customerOrder.getStatus().name(),
			resolveFulfillmentStatus(fulfillmentOrder),
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
}
