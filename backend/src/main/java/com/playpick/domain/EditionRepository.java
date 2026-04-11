package com.playpick.domain;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EditionRepository extends JpaRepository<Edition, Long> {

	@EntityGraph(attributePaths = "creator")
	List<Edition> findByStatusOrderByUpdatedAtDesc(EditionStatus status);

	@EntityGraph(attributePaths = "creator")
	List<Edition> findByCreatorUserIdOrderByUpdatedAtDesc(Long userId);
}
