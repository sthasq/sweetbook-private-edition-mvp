package com.playpick.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SweetbookWebhookEventRepository extends JpaRepository<SweetbookWebhookEvent, Long> {

	List<SweetbookWebhookEvent> findTop20ByOrderByCreatedAtDesc();
}
