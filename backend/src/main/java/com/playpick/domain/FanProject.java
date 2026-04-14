package com.playpick.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "fan_project")
@Getter
@Setter
@NoArgsConstructor
public class FanProject {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "edition_version_id", nullable = false)
	private EditionVersion editionVersion;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "owner_user_id", nullable = false)
	private AppUser ownerUser;

	@Convert(converter = JsonMapConverter.class)
	@Column(name = "personalization_data", nullable = false, columnDefinition = "json")
	private Map<String, Object> personalizationData = new LinkedHashMap<>();

	@Column(name = "sweetbook_book_uid", length = 120)
	private String sweetbookBookUid;

	@Column(name = "sweetbook_external_ref", length = 120)
	private String sweetbookExternalRef;

	@Column(name = "sweetbook_draft_created_at")
	private Instant sweetbookDraftCreatedAt;

	@Column(name = "sweetbook_finalized_at")
	private Instant sweetbookFinalizedAt;

	@Enumerated(EnumType.STRING)
	@Column(name = "book_operation_type", length = 32)
	private BookOperationType bookOperationType;

	@Enumerated(EnumType.STRING)
	@Column(name = "book_operation_status", nullable = false, length = 32)
	private BookOperationStatus bookOperationStatus = BookOperationStatus.IDLE;

	@Column(name = "book_operation_progress")
	private Integer bookOperationProgress;

	@Column(name = "book_operation_step", length = 64)
	private String bookOperationStep;

	@Column(name = "book_operation_message", length = 255)
	private String bookOperationMessage;

	@Column(name = "book_operation_error", length = 1000)
	private String bookOperationError;

	@Column(name = "book_operation_started_at")
	private Instant bookOperationStartedAt;

	@Column(name = "book_operation_finished_at")
	private Instant bookOperationFinishedAt;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 32)
	private FanProjectStatus status = FanProjectStatus.DRAFT;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;
}
