package com.playpick.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {

	Optional<CustomerOrder> findByFanProjectId(Long fanProjectId);

	Optional<CustomerOrder> findByOrderUid(String orderUid);

	@EntityGraph(attributePaths = {
		"fanProject",
		"fanProject.ownerUser",
		"fanProject.editionVersion",
		"fanProject.editionVersion.edition",
		"fanProject.editionVersion.edition.creator"
	})
	@Query("""
		select customerOrder
		from CustomerOrder customerOrder
		where customerOrder.fanProject.editionVersion.edition.creator.user.id = :creatorUserId
		order by customerOrder.orderedAt desc
		""")
	List<CustomerOrder> findAllByCreatorUserIdOrderByOrderedAtDesc(@Param("creatorUserId") Long creatorUserId);

	@EntityGraph(attributePaths = {
		"fanProject",
		"fanProject.ownerUser",
		"fanProject.editionVersion",
		"fanProject.editionVersion.edition",
		"fanProject.editionVersion.edition.creator"
	})
	@Query("select o from CustomerOrder o order by o.orderedAt desc")
	List<CustomerOrder> findAllOrderByOrderedAtDesc();
}
