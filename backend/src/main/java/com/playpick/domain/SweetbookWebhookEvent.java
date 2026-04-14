package com.playpick.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.type.NumericBooleanConverter;

@Entity
@Table(name = "sweetbook_webhook_event")
@Getter
@Setter
@NoArgsConstructor
public class SweetbookWebhookEvent {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "event_type", nullable = false, length = 80)
	private String eventType;

	@Column(name = "sweetbook_order_uid", length = 120)
	private String sweetbookOrderUid;

	@Column(name = "delivery_uid", length = 120)
	private String deliveryUid;

	@Convert(converter = JsonMapConverter.class)
	@Column(name = "payload", nullable = false, columnDefinition = "json")
	private Map<String, Object> payload = new LinkedHashMap<>();

	@Convert(converter = NumericBooleanConverter.class)
	@Column(name = "linked", nullable = false)
	private boolean linked;

	@Column(name = "processed_at")
	private Instant processedAt;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;
}
