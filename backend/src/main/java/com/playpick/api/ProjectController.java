package com.playpick.api;

import com.playpick.application.ProjectCommands;
import com.playpick.application.ProjectService;
import com.playpick.application.ProjectViews;
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

	@Operation(summary = "Generate AI collab image candidates for a project")
	@PostMapping("/{projectId}/ai-collab/generate")
	public AiCollabGenerateResponse generateAiCollab(
		@PathVariable Long projectId,
		@Valid @RequestBody AiCollabGenerateRequest request
	) {
		return AiCollabGenerateResponse.from(
			projectService.generateAiCollab(projectId, request.toCommand())
		);
	}

	@Operation(summary = "Get order summary for a completed project")
	@GetMapping("/{projectId}/order-summary")
	public ProjectViews.OrderSummary getOrderSummary(@PathVariable Long projectId) {
		return projectService.getOrderSummary(projectId);
	}

	@Operation(summary = "Create a Sweetbook draft book")
	@PostMapping("/{projectId}/generate-book")
	public ProjectViews.BookGeneration generateBook(@PathVariable Long projectId) {
		return projectService.generateBook(projectId);
	}

	@Operation(summary = "Finalize a Sweetbook draft book")
	@PostMapping("/{projectId}/finalize-book")
	public ProjectViews.BookGeneration finalizeBook(@PathVariable Long projectId) {
		return projectService.finalizeBook(projectId);
	}

	@Operation(summary = "Estimate order price")
	@PostMapping("/{projectId}/estimate")
	public EstimateResponse estimate(@PathVariable Long projectId, @RequestBody(required = false) ShippingRequest request) {
		ProjectViews.Estimate estimate = projectService.estimate(projectId, request == null ? null : request.toCommand());
		return EstimateResponse.from(estimate);
	}

	@Operation(summary = "Prepare a Toss Payments checkout session")
	@PostMapping("/{projectId}/payment-session")
	public PaymentSessionResponse preparePayment(@PathVariable Long projectId, @Valid @RequestBody ShippingRequest request) {
		return PaymentSessionResponse.from(projectService.preparePayment(projectId, request.toCommand()));
	}

	@Operation(summary = "Confirm a Toss Payments payment")
	@PostMapping("/{projectId}/payments/confirm")
	public OrderResponse confirmPayment(@PathVariable Long projectId, @Valid @RequestBody PaymentConfirmRequest request) {
		return OrderResponse.from(projectService.confirmPayment(projectId, request.toCommand()));
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

record AiCollabGenerateRequest(
	@NotBlank String templateKey,
	@NotBlank String sourceImageUrl,
	@NotBlank String officialImageUrl
) {
	ProjectCommands.GenerateAiCollab toCommand() {
		return new ProjectCommands.GenerateAiCollab(templateKey, sourceImageUrl, officialImageUrl);
	}
}

record AiCollabGenerateResponse(
	String provider,
	String model,
	java.util.List<AiCollabCandidateResponse> candidates
) {
	static AiCollabGenerateResponse from(ProjectViews.AiCollabGeneration generation) {
		return new AiCollabGenerateResponse(
			generation.provider(),
			generation.model(),
			generation.candidates().stream().map(AiCollabCandidateResponse::from).toList()
		);
	}
}

record AiCollabCandidateResponse(
	String id,
	String templateKey,
	String label,
	String caption,
	String imageUrl,
	String source
) {
	static AiCollabCandidateResponse from(ProjectViews.AiCollabCandidate candidate) {
		return new AiCollabCandidateResponse(
			candidate.id(),
			candidate.templateKey(),
			candidate.label(),
			candidate.caption(),
			candidate.imageUrl(),
			candidate.source()
		);
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

record PaymentSessionResponse(
	String provider,
	boolean enabled,
	String clientKey,
	String customerKey,
	String orderId,
	String orderName,
	BigDecimal amount,
	String customerName,
	String customerEmail,
	String customerMobilePhone,
	String successUrl,
	String failUrl
) {
	static PaymentSessionResponse from(ProjectViews.PaymentSession session) {
		return new PaymentSessionResponse(
			session.provider(),
			session.enabled(),
			session.clientKey(),
			session.customerKey(),
			session.orderId(),
			session.orderName(),
			session.amount(),
			session.customerName(),
			session.customerEmail(),
			session.customerMobilePhone(),
			session.successUrl(),
			session.failUrl()
		);
	}
}

record PaymentConfirmRequest(
	@NotBlank String paymentKey,
	@NotBlank String orderId,
	@Min(1) Long amount
) {
	ProjectCommands.PaymentConfirmation toCommand() {
		return new ProjectCommands.PaymentConfirmation(paymentKey, orderId, amount == null ? 0L : amount);
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
