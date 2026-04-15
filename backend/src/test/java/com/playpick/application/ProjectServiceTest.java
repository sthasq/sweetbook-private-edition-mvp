package com.playpick.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.playpick.config.AppProperties;
import com.playpick.config.TossPaymentsProperties;
import com.playpick.domain.AppUser;
import com.playpick.domain.AppUserRole;
import com.playpick.domain.BookOperationStatus;
import com.playpick.domain.BookOperationType;
import com.playpick.domain.CustomerOrderRepository;
import com.playpick.domain.Edition;
import com.playpick.domain.EditionVersion;
import com.playpick.domain.FanProject;
import com.playpick.domain.FanProjectRepository;
import com.playpick.domain.FanProjectStatus;
import com.playpick.domain.OrderRecordRepository;
import com.playpick.security.CurrentUserService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

	@Mock
	private EditionService editionService;

	@Mock
	private FanProjectRepository fanProjectRepository;

	@Mock
	private CustomerOrderRepository customerOrderRepository;

	@Mock
	private OrderRecordRepository orderRecordRepository;

	@Mock
	private ProjectPreviewAssembler projectPreviewAssembler;

	@Mock
	private SweetbookService sweetbookService;

	@Mock
	private SweetbookWebhookService sweetbookWebhookService;

	@Mock
	private AsyncBookGenerationService asyncBookGenerationService;

	@Mock
	private TossPaymentsService tossPaymentsService;

	@Mock
	private ChatPersonalizationService chatPersonalizationService;

	@Mock
	private CurrentUserService currentUserService;

	@Mock
	private AppProperties appProperties;

	@Mock
	private TossPaymentsProperties tossPaymentsProperties;

	@InjectMocks
	private ProjectService projectService;

	@Test
	void generateBookQueuesAsyncDraftWhenLiveIntegrationIsEnabled() {
		AppUser owner = new AppUser();
		owner.setId(12L);
		owner.setRole(AppUserRole.FAN);

		Edition edition = new Edition();
		edition.setId(7L);

		EditionVersion editionVersion = new EditionVersion();
		editionVersion.setId(31L);
		editionVersion.setEdition(edition);

		FanProject project = new FanProject();
		project.setId(55L);
		project.setOwnerUser(owner);
		project.setEditionVersion(editionVersion);
		project.setStatus(FanProjectStatus.PERSONALIZED);
		project.setPersonalizationData(Map.of("mode", "demo", "fanNickname", "팬"));
		project.setCreatedAt(Instant.parse("2026-04-14T00:00:00Z"));
		project.setUpdatedAt(Instant.parse("2026-04-14T00:00:00Z"));

		EditionViews.Detail editionDetail = new EditionViews.Detail(
			7L,
			"Trio Archive",
			"샘플",
			"/demo-assets/collab-trio-sunset.png",
			"PUBLISHED",
			new EditionViews.Creator(2L, "PlayPick", "@playpick", "", true),
			new EditionViews.Snapshot(
				31L,
				1,
				"SQUAREBOOK_HC",
				"cover-template",
				"publish-template",
				"content-template",
				Map.of(),
				Map.of(),
				Instant.parse("2026-04-14T00:00:00Z"),
				List.of(),
				List.of()
			),
			Instant.parse("2026-04-14T00:00:00Z"),
			Instant.parse("2026-04-14T00:00:00Z")
		);

		ProjectViews.Preview preview = new ProjectViews.Preview(
			55L,
			"PERSONALIZED",
			"demo",
			editionDetail,
			Map.of("mode", "demo", "fanNickname", "팬"),
			null,
			null,
			null,
			null,
			List.of()
		);

		ProjectViews.BookGeneration queuedGeneration = new ProjectViews.BookGeneration(
			55L,
			null,
			"QUEUED",
			"PERSONALIZED",
			"SQUAREBOOK_HC",
			"cover-template",
			"publish-template",
			"content-template",
			24,
			false,
			false
		);

		when(currentUserService.requireCurrentAppUser()).thenReturn(owner);
		when(fanProjectRepository.findById(55L)).thenReturn(Optional.of(project));
		when(fanProjectRepository.save(any(FanProject.class))).thenAnswer(invocation -> invocation.getArgument(0));
		when(editionService.getEdition(7L)).thenReturn(editionDetail);
		when(projectPreviewAssembler.assemble(any(ProjectViews.Snapshot.class), eq(editionDetail))).thenReturn(preview);
		when(sweetbookService.isLiveEnabled()).thenReturn(true);
		when(sweetbookService.describeBook(any(ProjectViews.Preview.class), any(), eq("QUEUED"), eq("PERSONALIZED"), eq(false), eq(false)))
			.thenReturn(queuedGeneration);

		ProjectViews.BookGeneration result = projectService.generateBook(55L);

		ArgumentCaptor<FanProject> projectCaptor = ArgumentCaptor.forClass(FanProject.class);
		verify(fanProjectRepository).save(projectCaptor.capture());
		FanProject savedProject = projectCaptor.getValue();

		assertThat(result.status()).isEqualTo("QUEUED");
		assertThat(result.projectStatus()).isEqualTo("PERSONALIZED");
		assertThat(savedProject.getBookOperationType()).isEqualTo(BookOperationType.DRAFT_GENERATION);
		assertThat(savedProject.getBookOperationStatus()).isEqualTo(BookOperationStatus.QUEUED);
		assertThat(savedProject.getBookOperationProgress()).isEqualTo(5);
		assertThat(savedProject.getSweetbookExternalRef()).startsWith("playpick-project-55-");

		verify(asyncBookGenerationService).generateDraft(55L);
		verify(sweetbookService, never()).prepareBookDraft(any(), anyString(), anyString(), anyBoolean());
	}

	@Test
	void reconcilePendingWebhooksAfterCommitCallsWebhookServiceImmediatelyWithoutTransaction() {
		projectService.reconcilePendingWebhooksAfterCommit("or_now");

		verify(sweetbookWebhookService).reconcilePendingEventsByOrderUid("or_now");
	}

	@Test
	void preparePaymentReturnsDisabledSessionWhenTossIsNotConfigured() {
		AppUser owner = new AppUser();
		owner.setId(12L);
		owner.setRole(AppUserRole.FAN);
		owner.setDisplayName("팬");
		owner.setEmail("fan@playpick.local");

		Edition edition = new Edition();
		edition.setId(7L);
		edition.setTitle("Trio Archive");

		EditionVersion editionVersion = new EditionVersion();
		editionVersion.setId(31L);
		editionVersion.setEdition(edition);

		FanProject project = new FanProject();
		project.setId(55L);
		project.setOwnerUser(owner);
		project.setEditionVersion(editionVersion);
		project.setStatus(FanProjectStatus.FINALIZED);
		project.setSweetbookBookUid("sb-book-55");

		ProjectCommands.Shipping shipping = new ProjectCommands.Shipping(
			"팬",
			"010-1234-5678",
			"06236",
			"서울 강남구 테헤란로 123",
			"8층",
			2
		);

		when(currentUserService.requireCurrentAppUser()).thenReturn(owner);
		when(fanProjectRepository.findById(55L)).thenReturn(Optional.of(project));
		when(customerOrderRepository.findByFanProjectId(55L)).thenReturn(Optional.empty());
		when(sweetbookService.estimateOrder(55L, "sb-book-55", shipping)).thenReturn(new ProjectViews.Estimate(
			55L,
			"KRW",
			new BigDecimal("3420.00"),
			new BigDecimal("3420.00"),
			BigDecimal.ZERO,
			BigDecimal.ZERO,
			BigDecimal.ZERO,
			BigDecimal.ZERO,
			true,
			Map.of()
		));
		when(tossPaymentsProperties.isReady()).thenReturn(false);
		when(appProperties.getMarginRate()).thenReturn(new BigDecimal("0.35"));
		when(appProperties.getCommissionRate()).thenReturn(new BigDecimal("0.20"));
		when(appProperties.getFrontendBaseUrl()).thenReturn("http://localhost:3000");

		ProjectViews.PaymentSession session = projectService.preparePayment(55L, shipping);

		assertThat(session.enabled()).isFalse();
		assertThat(session.provider()).isEqualTo("TOSS_PAYMENTS");
		assertThat(session.amount()).isEqualByComparingTo("4617.00");
		assertThat(session.customerName()).isEqualTo("팬");
		assertThat(session.customerEmail()).isEqualTo("fan@playpick.local");
		assertThat(session.customerMobilePhone()).isEqualTo("01012345678");
		assertThat(session.successUrl()).isEqualTo("http://localhost:3000/projects/55/payment/success");
		assertThat(session.failUrl()).isEqualTo("http://localhost:3000/projects/55/payment/fail");
		verify(customerOrderRepository, never()).save(any());
	}

	@Test
	void reconcilePendingWebhooksAfterCommitDefersWebhookServiceUntilTransactionCommit() {
		TransactionSynchronizationManager.initSynchronization();
		try {
			projectService.reconcilePendingWebhooksAfterCommit("or_later");

			verify(sweetbookWebhookService, never()).reconcilePendingEventsByOrderUid("or_later");
			assertThat(TransactionSynchronizationManager.getSynchronizations()).hasSize(1);

			for (TransactionSynchronization synchronization : TransactionSynchronizationManager.getSynchronizations()) {
				synchronization.afterCommit();
			}

			verify(sweetbookWebhookService).reconcilePendingEventsByOrderUid("or_later");
		} finally {
			TransactionSynchronizationManager.clearSynchronization();
		}
	}
}
