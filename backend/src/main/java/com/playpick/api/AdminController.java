package com.playpick.api;

import com.playpick.application.AdminService;
import com.playpick.application.AdminViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

	private final AdminService adminService;

	@Operation(summary = "Platform dashboard with revenue and commission stats")
	@GetMapping("/dashboard")
	public AdminViews.Dashboard getDashboard() {
		return adminService.getDashboard();
	}

	@Operation(summary = "Creator settlement summary")
	@GetMapping("/settlements")
	public List<AdminViews.CreatorSettlement> getSettlements() {
		return adminService.listCreatorSettlements();
	}

	@Operation(summary = "All orders across all creators")
	@GetMapping("/orders")
	public List<AdminViews.OrderSummary> getOrders() {
		return adminService.listAllOrders();
	}

	@Operation(summary = "Recent Sweetbook webhook events")
	@GetMapping("/webhooks")
	public List<AdminViews.WebhookEventSummary> getWebhooks() {
		return adminService.listRecentWebhooks();
	}

	@Operation(summary = "All platform users")
	@GetMapping("/users")
	public List<AdminViews.UserSummary> getUsers() {
		return adminService.listUsers();
	}

	@Operation(summary = "Verify a creator")
	@PostMapping("/creators/{creatorId}/verify")
	public void verifyCreator(@PathVariable Long creatorId) {
		adminService.verifyCreator(creatorId);
	}
}
