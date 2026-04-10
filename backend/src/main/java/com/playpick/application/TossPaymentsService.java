package com.playpick.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.playpick.config.TossPaymentsProperties;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Service
@RequiredArgsConstructor
public class TossPaymentsService {

	private final TossPaymentsProperties properties;
	private final WebClient.Builder webClientBuilder;
	private final ObjectMapper objectMapper;

	public ConfirmedPayment confirm(ProjectCommands.PaymentConfirmation command) {
		if (!properties.isReady()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Toss Payments is not configured");
		}

		Map<String, Object> payload = Map.of(
			"paymentKey", command.paymentKey(),
			"orderId", command.orderId(),
			"amount", command.amount()
		);

		try {
			String response = webClientBuilder.build()
				.post()
				.uri(properties.getBaseUrl() + "/v1/payments/confirm")
				.header(HttpHeaders.AUTHORIZATION, basicAuthorization(properties.getSecretKey()))
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(payload)
				.retrieve()
				.bodyToMono(String.class)
				.block();
			return parseConfirmedPayment(response);
		} catch (WebClientResponseException exception) {
			throw new AppException(HttpStatus.BAD_REQUEST, extractErrorMessage(exception), exception);
		}
	}

	private ConfirmedPayment parseConfirmedPayment(String body) {
		try {
			JsonNode node = objectMapper.readTree(body);
			return new ConfirmedPayment(
				asText(node, "paymentKey"),
				asText(node, "orderId"),
				asBigDecimal(node, "totalAmount"),
				asText(node, "method"),
				asInstant(node, "approvedAt"),
				objectMapper.readValue(body, new TypeReference<LinkedHashMap<String, Object>>() {})
			);
		} catch (IOException exception) {
			throw new AppException(HttpStatus.BAD_GATEWAY, "Failed to parse Toss Payments response", exception);
		}
	}

	private String basicAuthorization(String secretKey) {
		String encoded = Base64.getEncoder().encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8));
		return "Basic " + encoded;
	}

	private String extractErrorMessage(WebClientResponseException exception) {
		try {
			JsonNode node = objectMapper.readTree(exception.getResponseBodyAsString());
			String message = asText(node, "message");
			return message.isBlank() ? "Toss payment confirmation failed" : message;
		} catch (IOException ignored) {
			return "Toss payment confirmation failed";
		}
	}

	private String asText(JsonNode node, String fieldName) {
		JsonNode field = node.path(fieldName);
		return field.isMissingNode() || field.isNull() ? "" : field.asText("");
	}

	private BigDecimal asBigDecimal(JsonNode node, String fieldName) {
		JsonNode field = node.path(fieldName);
		if (field.isMissingNode() || field.isNull()) {
			return BigDecimal.ZERO;
		}
		if (field.isNumber()) {
			return field.decimalValue();
		}
		String text = field.asText("");
		return text.isBlank() ? BigDecimal.ZERO : new BigDecimal(text);
	}

	private Instant asInstant(JsonNode node, String fieldName) {
		String text = asText(node, fieldName);
		if (text.isBlank()) {
			return null;
		}
		try {
			return OffsetDateTime.parse(text).toInstant();
		} catch (DateTimeParseException exception) {
			return null;
		}
	}

	public record ConfirmedPayment(
		String paymentKey,
		String orderId,
		BigDecimal totalAmount,
		String method,
		Instant approvedAt,
		Map<String, Object> raw
	) {
	}
}
