package com.privateedition.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "creator_profile")
@Getter
@Setter
@NoArgsConstructor
public class CreatorProfile {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "display_name", nullable = false, length = 100)
	private String displayName;

	@Column(name = "channel_handle", nullable = false, length = 100)
	private String channelHandle;

	@Column(name = "avatar_url", nullable = false, length = 500)
	private String avatarUrl;

	@Column(nullable = false)
	private boolean verified;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;
}
