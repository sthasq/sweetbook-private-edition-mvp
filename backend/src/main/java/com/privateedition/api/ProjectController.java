package com.privateedition.api;

import com.privateedition.application.ProjectCommands;
import com.privateedition.application.ProjectService;
import com.privateedition.application.ProjectViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Projects")
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

	private final ProjectService projectService;

	@Operation(summary = "Create a fan project")
	@PostMapping
	public CreateProjectResponse createProject(@RequestBody(required = false) CreateProjectRequest request) {
		ProjectViews.Snapshot snapshot = projectService.createProject((request == null ? new CreateProjectRequest(null, null, null) : request).toCommand());
		return new CreateProjectResponse(String.valueOf(snapshot.id()));
	}

	@Operation(summary = "Update personalization data")
	@PatchMapping("/{projectId}")
	public ProjectViews.Snapshot updateProject(@PathVariable Long projectId, @RequestBody(required = false) Map<String, Object> request) {
		Map<String, Object> payload = unwrapPersonalizationPayload(request);
		return projectService.updateProject(projectId, new ProjectCommands.UpdateProject(payload));
	}

	@Operation(summary = "Get preview data for a project")
	@GetMapping("/{projectId}/preview")
	public ProjectViews.Preview getPreview(@PathVariable Long projectId) {
		return projectService.getPreview(projectId);
	}

	@Operation(summary = "Get order summary for a completed project")
	@GetMapping("/{projectId}/order-summary")
	public ProjectViews.OrderSummary getOrderSummary(@PathVariable Long projectId) {
		return projectService.getOrderSummary(projectId);
	}

	@Operation(summary = "Generate a Sweetbook book")
	@PostMapping("/{projectId}/generate-book")
	public ProjectViews.BookGeneration generateBook(@PathVariable Long projectId) {
		return projectService.generateBook(projectId);
	}

	@Operation(summary = "Estimate order price")
	@PostMapping("/{projectId}/estimate")
	public EstimateResponse estimate(@PathVariable Long projectId, @RequestBody(required = false) ShippingRequest request) {
		ProjectViews.Estimate estimate = projectService.estimate(projectId, request == null ? null : request.toCommand());
		return EstimateResponse.from(estimate);
	}

	@Operation(summary = "Create an order")
	@PostMapping("/{projectId}/order")
	public OrderResponse order(@PathVariable Long projectId, @Valid @RequestBody ShippingRequest request) {
		return OrderResponse.from(projectService.order(projectId, request.toCommand()));
	}

	private Map<String, Object> unwrapPersonalizationPayload(Map<String, Object> request) {
		if (request == null || request.isEmpty()) {
			return Map.of();
		}
		Object nested = request.get("personalizationData");
		if (nested instanceof Map<?, ?> map) {
			Map<String, Object> result = new LinkedHashMap<>();
			map.forEach((key, value) -> result.put(String.valueOf(key), value));
			return result;
		}
		return request;
	}
}

record CreateProjectRequest(
	Long editionId,
	String mode,
	Map<String, Object> personalizationData
) {
	ProjectCommands.CreateProject toCommand() {
		return new ProjectCommands.CreateProject(editionId, mode, personalizationData);
	}
}

record CreateProjectResponse(
	String projectId
) {
}

record EstimateResponse(
	BigDecimal totalAmount,
	BigDecimal shippingFee,
	boolean simulated
) {
	static EstimateResponse from(ProjectViews.Estimate estimate) {
		return new EstimateResponse(estimate.totalAmount(), estimate.shippingFee(), estimate.simulated());
	}
}

record ShippingRequest(
	@NotBlank String recipientName,
	@NotBlank String recipientPhone,
	@NotBlank String postalCode,
	@NotBlank String address1,
	String address2,
	@Min(1) Integer quantity
) {
	ProjectCommands.Shipping toCommand() {
		return new ProjectCommands.Shipping(recipientName, recipientPhone, postalCode, address1, address2, quantity == null ? 1 : quantity);
	}
}

record OrderResponse(
	String siteOrderUid,
	String siteOrderStatus,
	String fulfillmentOrderUid,
	String fulfillmentStatus,
	BigDecimal totalAmount,
	boolean simulated
) {
	static OrderResponse from(ProjectViews.OrderResult orderResult) {
		return new OrderResponse(
			orderResult.siteOrderUid(),
			orderResult.siteOrderStatus(),
			orderResult.fulfillmentOrderUid(),
			orderResult.fulfillmentStatus(),
			orderResult.totalAmount(),
			orderResult.simulated()
		);
	}
}
