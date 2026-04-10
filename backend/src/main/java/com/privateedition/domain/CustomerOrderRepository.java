package com.privateedition.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerOrderRepository extends JpaRepository<CustomerOrder, Long> {

	Optional<CustomerOrder> findByFanProjectId(Long fanProjectId);
}
