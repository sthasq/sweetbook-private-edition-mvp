package com.privateedition.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonalizationSchemaRepository extends JpaRepository<PersonalizationSchema, Long> {

	List<PersonalizationSchema> findByEditionVersionIdOrderBySortOrderAsc(Long editionVersionId);

	void deleteByEditionVersionId(Long editionVersionId);
}
