package com.playpick.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CuratedAssetRepository extends JpaRepository<CuratedAsset, Long> {

	List<CuratedAsset> findByEditionVersionIdOrderBySortOrderAsc(Long editionVersionId);

	void deleteByEditionVersionId(Long editionVersionId);
}
