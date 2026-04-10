package com.playpick.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "customer_order")
@Getter
@Setter
@NoArgsConstructor
public class CustomerOrder {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "fan_project_id", nullable = false)
	private FanProject fanProject;

	@Column(name = "order_uid", nullable = false, length = 120)
	private String orderUid;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 32)
	private OrderStatus status = OrderStatus.CREATED;

	@Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
	private BigDecimal totalAmount;

	@Column(nullable = false)
	private boolean simulated;

	@Column(name = "recipient_name", nullable = false, length = 100)
	private String recipientName;

	@Column(name = "recipient_phone", nullable = false, length = 50)
	private String recipientPhone;

	@Column(name = "postal_code", nullable = false, length = 20)
	private String postalCode;

	@Column(name = "address1", nullable = false, length = 255)
	private String address1;

	@Column(name = "address2", length = 255)
	private String address2;

	@Column(nullable = false)
	private int quantity = 1;

	@Column(name = "payment_provider", length = 32)
	private String paymentProvider;

	@Column(name = "payment_key", length = 200)
	private String paymentKey;

	@Column(name = "payment_method", length = 50)
	private String paymentMethod;

	@Column(name = "payment_approved_at")
	private Instant paymentApprovedAt;

	@Column(name = "ordered_at", nullable = false)
	private Instant orderedAt;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;
}
