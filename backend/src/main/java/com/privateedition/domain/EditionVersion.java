package com.privateedition.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
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
@Table(name = "edition_version")
@Getter
@Setter
@NoArgsConstructor
public class EditionVersion {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "edition_id", nullable = false)
	private Edition edition;

	@Column(name = "version_number", nullable = false)
	private Integer versionNumber;

	@Convert(converter = JsonMapConverter.class)
	@Column(name = "official_intro", nullable = false, columnDefinition = "json")
	private Map<String, Object> officialIntro = new LinkedHashMap<>();

	@Convert(converter = JsonMapConverter.class)
	@Column(name = "official_closing", nullable = false, columnDefinition = "json")
	private Map<String, Object> officialClosing = new LinkedHashMap<>();

	@Column(name = "book_spec_uid", nullable = false, length = 80)
	private String bookSpecUid;

	@Column(name = "approved_at")
	private Instant approvedAt;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;
}
