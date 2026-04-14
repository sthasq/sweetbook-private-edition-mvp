package com.playpick.application;

import com.playpick.domain.BookOperationStatus;
import com.playpick.domain.BookOperationType;
import com.playpick.domain.FanProject;
import com.playpick.domain.FanProjectRepository;
import com.playpick.domain.FanProjectStatus;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class AsyncBookGenerationService {

	private final FanProjectRepository fanProjectRepository;
	private final EditionService editionService;
	private final ProjectPreviewAssembler projectPreviewAssembler;
	private final SweetbookService sweetbookService;
	private final PlatformTransactionManager transactionManager;

	@Async("bookWorkflowTaskExecutor")
	public void generateDraft(Long projectId) {
		try {
			updateOperation(projectId, BookOperationStatus.RUNNING, 8, "PREPARING", "포토북 구성을 준비하고 있어요.", null);
			ProjectViews.Preview preview = buildPreview(projectId);
			updateOperation(projectId, BookOperationStatus.RUNNING, 18, "PLANNING", "페이지 흐름을 계산하고 있어요.", null);

			ProjectViews.BookGeneration generation = sweetbookService.prepareBookDraft(
				preview,
				externalRef(projectId),
				idempotencyKey(projectId),
				false,
				progress -> updateOperation(
					projectId,
					BookOperationStatus.RUNNING,
					progress.progress(),
					progress.step(),
					progress.message(),
					null
				)
			);

			inTransaction(() -> {
				FanProject project = requireProject(projectId);
				project.setSweetbookBookUid(generation.bookUid());
				project.setSweetbookDraftCreatedAt(Instant.now());
				project.setSweetbookFinalizedAt(null);
				project.setStatus(FanProjectStatus.BOOK_CREATED);
				clearOperation(project);
				fanProjectRepository.save(project);
				return null;
			});
		} catch (Exception exception) {
			log.warn("Async Sweetbook draft generation failed for project {}", projectId, exception);
			String message = exception instanceof AppException appException
				? appException.getMessage()
				: "포토북 생성에 실패했어요. 잠시 후 다시 시도해 주세요.";
			inTransaction(() -> {
				FanProject project = requireProject(projectId);
				project.setBookOperationType(BookOperationType.DRAFT_GENERATION);
				project.setBookOperationStatus(BookOperationStatus.FAILED);
				project.setBookOperationProgress(100);
				project.setBookOperationStep("FAILED");
				project.setBookOperationMessage("포토북 생성이 중단되었어요.");
				project.setBookOperationError(message);
				project.setBookOperationFinishedAt(Instant.now());
				fanProjectRepository.save(project);
				return null;
			});
		}
	}

	private ProjectViews.Preview buildPreview(Long projectId) {
		return inTransaction(() -> {
			FanProject project = requireProject(projectId);
			EditionViews.Detail edition = editionService.getEdition(project.getEditionVersion().getEdition().getId());
			return projectPreviewAssembler.assemble(toSnapshot(project), edition);
		});
	}

	private String externalRef(Long projectId) {
		return inTransaction(() -> {
			FanProject project = requireProject(projectId);
			return project.getSweetbookExternalRef();
		});
	}

	private String idempotencyKey(Long projectId) {
		return inTransaction(() -> {
			FanProject project = requireProject(projectId);
			return project.getSweetbookExternalRef() + "-v" + project.getEditionVersion().getId();
		});
	}

	private void updateOperation(
		Long projectId,
		BookOperationStatus status,
		Integer progress,
		String step,
		String message,
		String error
	) {
		inTransaction(() -> {
			FanProject project = requireProject(projectId);
			project.setBookOperationType(BookOperationType.DRAFT_GENERATION);
			project.setBookOperationStatus(status);
			project.setBookOperationProgress(progress);
			project.setBookOperationStep(step);
			project.setBookOperationMessage(message);
			project.setBookOperationError(error);
			if (project.getBookOperationStartedAt() == null) {
				project.setBookOperationStartedAt(Instant.now());
			}
			project.setBookOperationFinishedAt(null);
			fanProjectRepository.save(project);
			return null;
		});
	}

	private FanProject requireProject(Long projectId) {
		return fanProjectRepository.findById(projectId)
			.orElseThrow(() -> new AppException(org.springframework.http.HttpStatus.NOT_FOUND, "Project not found: " + projectId));
	}

	private void clearOperation(FanProject project) {
		project.setBookOperationType(null);
		project.setBookOperationStatus(BookOperationStatus.IDLE);
		project.setBookOperationProgress(null);
		project.setBookOperationStep(null);
		project.setBookOperationMessage(null);
		project.setBookOperationError(null);
		project.setBookOperationStartedAt(null);
		project.setBookOperationFinishedAt(null);
	}

	private ProjectViews.Snapshot toSnapshot(FanProject project) {
		return new ProjectViews.Snapshot(
			project.getId(),
			project.getEditionVersion().getEdition().getId(),
			project.getEditionVersion().getId(),
			project.getStatus().name(),
			toBookOperation(project),
			project.getPersonalizationData(),
			project.getSweetbookBookUid(),
			project.getSweetbookExternalRef(),
			project.getSweetbookDraftCreatedAt(),
			project.getSweetbookFinalizedAt(),
			project.getCreatedAt(),
			project.getUpdatedAt()
		);
	}

	private ProjectViews.BookOperation toBookOperation(FanProject project) {
		if (project.getBookOperationStatus() == null || project.getBookOperationStatus() == BookOperationStatus.IDLE) {
			return null;
		}
		return new ProjectViews.BookOperation(
			project.getBookOperationType() == null ? null : project.getBookOperationType().name(),
			project.getBookOperationStatus().name(),
			project.getBookOperationProgress(),
			project.getBookOperationStep(),
			project.getBookOperationMessage(),
			project.getBookOperationError(),
			project.getBookOperationStartedAt(),
			project.getBookOperationFinishedAt()
		);
	}

	private <T> T inTransaction(java.util.function.Supplier<T> supplier) {
		TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
		return transactionTemplate.execute(status -> supplier.get());
	}
}
