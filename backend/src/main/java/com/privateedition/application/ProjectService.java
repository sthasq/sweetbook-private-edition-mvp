package com.privateedition.application;

import com.privateedition.domain.FanProject;
import com.privateedition.domain.FanProjectRepository;
import com.privateedition.domain.FanProjectStatus;
import com.privateedition.domain.OrderRecord;
import com.privateedition.domain.OrderRecordRepository;
import com.privateedition.domain.OrderStatus;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
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
	private final OrderRecordRepository orderRecordRepository;
	private final ProjectPreviewAssembler projectPreviewAssembler;
	private final SweetbookService sweetbookService;

	@Transactional
	public ProjectViews.Snapshot createProject(ProjectCommands.CreateProject command) {
		Long editionId = command.editionId() == null ? editionService.getDefaultPublishedEditionId() : command.editionId();
		FanProject project = new FanProject();
		project.setEditionVersion(editionService.requirePublishedVersion(editionId));

		Map<String, Object> personalizationData = new LinkedHashMap<>();
		if (command.personalizationData() != null) {
			personalizationData.putAll(command.personalizationData());
		}
		personalizationData.putIfAbsent("mode", command.mode() == null || command.mode().isBlank() ? "demo" : command.mode());

		project.setPersonalizationData(personalizationData);
		project.setStatus(FanProjectStatus.DRAFT);
		project = fanProjectRepository.save(project);
		return toSnapshot(project);
	}

	@Transactional
	public ProjectViews.Snapshot updateProject(Long projectId, ProjectCommands.UpdateProject command) {
		FanProject project = requireProject(projectId);
		Map<String, Object> personalizationData = new LinkedHashMap<>(project.getPersonalizationData());
		if (command.personalizationData() != null) {
			personalizationData.putAll(command.personalizationData());
		}
		project.setPersonalizationData(personalizationData);
		project.setStatus(FanProjectStatus.PERSONALIZED);
		return toSnapshot(fanProjectRepository.save(project));
	}

	public ProjectViews.Preview getPreview(Long projectId) {
		FanProject project = requireProject(projectId);
		EditionViews.Detail edition = editionService.getEdition(project.getEditionVersion().getEdition().getId());
		return projectPreviewAssembler.assemble(toSnapshot(project), edition);
	}

	@Transactional
	public ProjectViews.BookGeneration generateBook(Long projectId) {
		FanProject project = requireProject(projectId);
		ProjectViews.Preview preview = getPreview(projectId);
		ProjectViews.BookGeneration generation = sweetbookService.generateBook(preview);
		project.setSweetbookBookUid(generation.bookUid());
		project.setStatus(FanProjectStatus.FINALIZED);
		fanProjectRepository.save(project);
		return generation;
	}

	public ProjectViews.Estimate estimate(Long projectId, ProjectCommands.Shipping shipping) {
		FanProject project = requireProject(projectId);
		if (project.getSweetbookBookUid() == null || project.getSweetbookBookUid().isBlank()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Generate the Sweetbook book before requesting an estimate");
		}
		return sweetbookService.estimateOrder(projectId, project.getSweetbookBookUid(), shipping);
	}

	@Transactional
	public ProjectViews.OrderResult order(Long projectId, ProjectCommands.Shipping shipping) {
		FanProject project = requireProject(projectId);
		if (project.getSweetbookBookUid() == null || project.getSweetbookBookUid().isBlank()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Generate the Sweetbook book before ordering");
		}

		OrderRecord existing = orderRecordRepository.findByFanProjectId(projectId).orElse(null);
		if (existing != null) {
			return new ProjectViews.OrderResult(
				projectId,
				existing.getSweetbookOrderUid(),
				existing.getStatus().name(),
				existing.getTotalAmount(),
				!sweetbookService.isLiveEnabled(),
				Map.of("reused", true)
			);
		}

		ProjectViews.OrderResult result = sweetbookService.createOrder(projectId, project.getSweetbookBookUid(), shipping);

		OrderRecord orderRecord = new OrderRecord();
		orderRecord.setFanProject(project);
		orderRecord.setSweetbookOrderUid(result.orderUid());
		orderRecord.setStatus(OrderStatus.valueOf(result.status()));
		orderRecord.setTotalAmount(result.totalAmount());
		orderRecord.setRecipientName(shipping.recipientName());
		orderRecord.setRecipientPhone(shipping.recipientPhone());
		orderRecord.setPostalCode(shipping.postalCode());
		orderRecord.setAddress1(shipping.address1());
		orderRecord.setAddress2(shipping.address2());
		orderRecord.setOrderedAt(Instant.now());
		orderRecordRepository.save(orderRecord);

		project.setStatus(FanProjectStatus.ORDERED);
		fanProjectRepository.save(project);
		return result;
	}

	private FanProject requireProject(Long projectId) {
		return fanProjectRepository.findById(projectId)
			.orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Project not found: " + projectId));
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
}
