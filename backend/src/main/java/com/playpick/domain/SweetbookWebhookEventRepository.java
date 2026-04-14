package com.playpick.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SweetbookWebhookEventRepository extends JpaRepository<SweetbookWebhookEvent, Long> {

	List<SweetbookWebhookEvent> findTop20ByOrderByCreatedAtDesc();

	Optional<SweetbookWebhookEvent> findByDeliveryUid(String deliveryUid);

	List<SweetbookWebhookEvent> findBySweetbookOrderUidAndLinkedFalseOrderByCreatedAtAsc(String sweetbookOrderUid);
}
