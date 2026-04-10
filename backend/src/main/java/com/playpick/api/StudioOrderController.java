package com.playpick.api;

import com.playpick.application.StudioOrderService;
import com.playpick.application.StudioViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Studio")
@RestController
@RequestMapping("/api/studio/orders")
@RequiredArgsConstructor
public class StudioOrderController {

	private final StudioOrderService studioOrderService;

	@Operation(summary = "List recent orders for the current creator")
	@GetMapping
	public StudioViews.OrderDashboard getOrderDashboard() {
		return studioOrderService.getOrderDashboard();
	}
}
