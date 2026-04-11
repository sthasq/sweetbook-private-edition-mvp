package com.playpick.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRecordRepository extends JpaRepository<OrderRecord, Long> {

	Optional<OrderRecord> findByFanProjectId(Long fanProjectId);

	Optional<OrderRecord> findBySweetbookOrderUid(String sweetbookOrderUid);

	@EntityGraph(attributePaths = "fanProject")
	List<OrderRecord> findByFanProjectIdIn(Collection<Long> fanProjectIds);
}
