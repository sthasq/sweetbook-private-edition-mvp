package com.playpick.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "personalization_schema")
@Getter
@Setter
@NoArgsConstructor
public class PersonalizationSchema {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "edition_version_id", nullable = false)
	private EditionVersion editionVersion;

	@Column(name = "field_key", nullable = false, length = 80)
	private String fieldKey;

	@Column(nullable = false, length = 200)
	private String label;

	@Column(name = "input_type", nullable = false, length = 50)
	private String inputType;

	@Column(nullable = false)
	private boolean required;

	@Column(name = "max_length")
	private Integer maxLength;

	@Column(name = "sort_order", nullable = false)
	private Integer sortOrder;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;
}
