package com.privateedition.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRecordRepository extends JpaRepository<OrderRecord, Long> {

	Optional<OrderRecord> findByFanProjectId(Long fanProjectId);
}
