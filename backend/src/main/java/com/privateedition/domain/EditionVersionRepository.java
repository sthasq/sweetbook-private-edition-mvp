package com.privateedition.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EditionVersionRepository extends JpaRepository<EditionVersion, Long> {

	Optional<EditionVersion> findTopByEditionIdAndApprovedAtIsNotNullOrderByVersionNumberDesc(Long editionId);

	Optional<EditionVersion> findTopByEditionIdAndApprovedAtIsNullOrderByIdDesc(Long editionId);

	Optional<EditionVersion> findTopByEditionIdOrderByVersionNumberDesc(Long editionId);
}
