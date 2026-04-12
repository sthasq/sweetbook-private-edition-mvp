package com.playpick.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.playpick.application.AppException;
import com.playpick.application.ProjectCommands;
import com.playpick.application.ProjectViews;
import com.playpick.application.SweetbookService;
import com.playpick.application.TossPaymentsService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
	"sweetbook.enabled=true",
	"sweetbook.api-key=test-sweetbook-key",
	"toss-payments.enabled=true",
	"toss-payments.client-key=test-client-key",
	"toss-payments.secret-key=test-secret-key",
	"app.frontend-base-url=https://playpick.example.com",
	"app.public-base-url=https://playpick.example.com"
})
@AutoConfigureMockMvc
@ActiveProfiles("local")
class PaymentFulfillmentIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private SweetbookService sweetbookService;

	@MockBean
	private TossPaymentsService tossPaymentsService;

	@Test
	void paymentConfirmationDoesNotMarkProjectOrderedUntilSweetbookOrderExists() throws Exception {
		MockHttpSession session = signUp(uniqueEmail("payment-retry"), "Retry Fan");
		long projectId = createProject(session, 1L, "demo");

		when(sweetbookService.prepareBookDraft(any(), anyString(), anyString(), anyBoolean()))
			.thenReturn(new ProjectViews.BookGeneration(
				projectId,
				"sb-book-retry",
				"DRAFT",
				"BOOK_CREATED",
				"SQUAREBOOK_HC",
				"cover-template",
				"publish-template",
				"content-template",
				24,
				false,
				false
			));
		when(sweetbookService.finalizeBook(any(), anyString(), anyBoolean()))
			.thenReturn(new ProjectViews.BookGeneration(
				projectId,
				"sb-book-retry",
				"FINALIZED",
				"FINALIZED",
				"SQUAREBOOK_HC",
				"cover-template",
				"publish-template",
				"content-template",
				24,
				false,
				false
			));
		when(sweetbookService.estimateOrder(anyLong(), anyString(), any(ProjectCommands.Shipping.class)))
			.thenReturn(new ProjectViews.Estimate(
				projectId,
				"KRW",
				new BigDecimal("3420.00"),
				new BigDecimal("3420.00"),
				BigDecimal.ZERO,
				BigDecimal.ZERO,
				BigDecimal.ZERO,
				BigDecimal.ZERO,
				false,
				Map.of()
			));
		when(tossPaymentsService.confirm(any(ProjectCommands.PaymentConfirmation.class)))
			.thenAnswer(invocation -> {
				ProjectCommands.PaymentConfirmation confirmation = invocation.getArgument(0);
				return new TossPaymentsService.ConfirmedPayment(
					confirmation.paymentKey(),
					confirmation.orderId(),
					BigDecimal.valueOf(confirmation.amount()),
					"CARD",
					Instant.parse("2026-04-13T00:00:00Z"),
					Map.of()
				);
			});
		when(sweetbookService.createOrder(anyLong(), anyString(), any(ProjectCommands.Shipping.class)))
			.thenThrow(new AppException(HttpStatus.BAD_GATEWAY, "Sweetbook vendor down"))
			.thenReturn(new ProjectViews.FulfillmentResult(
				projectId,
				"or_live_retry_1",
				"PAID",
				new BigDecimal("3420.00"),
				false,
				Map.of("orderUid", "or_live_retry_1")
			));

		mockMvc.perform(post("/api/projects/{projectId}/generate-book", projectId).with(csrf()).session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.projectStatus").value("BOOK_CREATED"));

		mockMvc.perform(post("/api/projects/{projectId}/finalize-book", projectId).with(csrf()).session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.projectStatus").value("FINALIZED"));

		MvcResult paymentSessionResult = mockMvc.perform(post("/api/projects/{projectId}/payment-session", projectId)
				.with(csrf())
				.session(session)
				.contentType(APPLICATION_JSON)
				.content(shippingPayload("천경신", "010-1234-5678")))
			.andExpect(status().isOk())
			.andReturn();

		Map<String, Object> paymentSession = objectMapper.readValue(
			paymentSessionResult.getResponse().getContentAsString(),
			new TypeReference<>() {
			}
		);
		String orderId = String.valueOf(paymentSession.get("orderId"));
		long amount = new BigDecimal(String.valueOf(paymentSession.get("amount"))).longValueExact();

		mockMvc.perform(post("/api/projects/{projectId}/payments/confirm", projectId)
				.with(csrf())
				.session(session)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "paymentKey": "pay_retry_1",
					  "orderId": "%s",
					  "amount": %d
					}
					""".formatted(orderId, amount)))
			.andExpect(status().isBadGateway())
			.andExpect(jsonPath("$.detail").value("Sweetbook 주문 접수에 실패했습니다. 프로젝트를 주문 완료로 표시하지 않았습니다. 잠시 후 다시 시도해 주세요."));

		mockMvc.perform(get("/api/me/projects").session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].projectId").value(projectId))
			.andExpect(jsonPath("$[0].status").value("FINALIZED"))
			.andExpect(jsonPath("$[0].continuePath").value("/projects/" + projectId + "/shipping"));

		mockMvc.perform(get("/api/projects/{projectId}/order-summary", projectId).session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.projectStatus").value("FINALIZED"))
			.andExpect(jsonPath("$.siteOrderStatus").value("PAID"))
			.andExpect(jsonPath("$.fulfillmentStatus").value("PENDING_SUBMISSION"));

		mockMvc.perform(post("/api/projects/{projectId}/payments/confirm", projectId)
				.with(csrf())
				.session(session)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "paymentKey": "pay_retry_1",
					  "orderId": "%s",
					  "amount": %d
					}
					""".formatted(orderId, amount)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.siteOrderStatus").value("PAID"))
			.andExpect(jsonPath("$.fulfillmentOrderUid").value("or_live_retry_1"))
			.andExpect(jsonPath("$.fulfillmentStatus").value("SUBMITTED"));

		mockMvc.perform(get("/api/me/projects").session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].projectId").value(projectId))
			.andExpect(jsonPath("$[0].status").value("ORDERED"))
			.andExpect(jsonPath("$[0].continuePath").value("/projects/" + projectId + "/complete"));

		verify(tossPaymentsService, times(1)).confirm(any(ProjectCommands.PaymentConfirmation.class));
		verify(sweetbookService, times(2)).createOrder(anyLong(), anyString(), any(ProjectCommands.Shipping.class));
	}

	private MockHttpSession signUp(String email, String displayName) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/auth/signup")
				.with(csrf())
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "Fan12345!",
					  "displayName": "%s",
					  "role": "FAN"
					}
					""".formatted(email, displayName)))
			.andExpect(status().isOk())
			.andReturn();

		return (MockHttpSession) result.getRequest().getSession(false);
	}

	private long createProject(MockHttpSession session, long editionId, String mode) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/projects")
				.with(csrf())
				.session(session)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "editionId": %d,
					  "mode": "%s"
					}
					""".formatted(editionId, mode)))
			.andExpect(status().isOk())
			.andReturn();

		Map<String, Object> payload = objectMapper.readValue(
			result.getResponse().getContentAsString(),
			new TypeReference<>() {
			}
		);
		return Long.parseLong(String.valueOf(payload.get("projectId")));
	}

	private String shippingPayload(String recipientName, String recipientPhone) {
		return """
			{
			  "recipientName": "%s",
			  "recipientPhone": "%s",
			  "postalCode": "06236",
			  "address1": "서울특별시 강남구 테헤란로 123",
			  "address2": "10층",
			  "quantity": 1
			}
			""".formatted(recipientName, recipientPhone);
	}

	private String uniqueEmail(String prefix) {
		return prefix + "-" + UUID.randomUUID() + "@playpick.local";
	}
}
