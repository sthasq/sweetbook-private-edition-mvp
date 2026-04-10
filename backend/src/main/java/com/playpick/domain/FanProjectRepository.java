package com.playpick.domain;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FanProjectRepository extends JpaRepository<FanProject, Long> {

	@EntityGraph(attributePaths = {
		"editionVersion",
		"editionVersion.edition"
	})
	List<FanProject> findByOwnerUserIdOrderByUpdatedAtDesc(Long ownerUserId);
}
