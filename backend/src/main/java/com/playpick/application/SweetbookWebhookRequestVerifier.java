package com.playpick.application;

import com.playpick.config.SweetbookProperties;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class SweetbookWebhookRequestVerifier {

	private final SweetbookProperties sweetbookProperties;

	void verify(SweetbookWebhookService.WebhookRequest request) {
		if (!sweetbookProperties.isWebhookSecretConfigured()) {
			throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "Sweetbook webhook secret is not configured");
		}
		long timestamp = parseTimestampSeconds(request.timestamp());
		long now = Instant.now().getEpochSecond();
		long tolerance = sweetbookProperties.getWebhookTimestampToleranceSeconds();
		if (Math.abs(now - timestamp) > tolerance) {
			throw new AppException(HttpStatus.FORBIDDEN, "Sweetbook webhook timestamp is invalid or too old");
		}

		String providedSignature = request.signature();
		if (providedSignature == null || providedSignature.isBlank()) {
			throw new AppException(HttpStatus.FORBIDDEN, "Sweetbook webhook signature is invalid");
		}
		String expectedSignature = signPayload(
			sweetbookProperties.getWebhookSecret(),
			timestamp + "." + request.rawBody()
		);
		if (!secureEquals(expectedSignature, providedSignature.trim())) {
			throw new AppException(HttpStatus.FORBIDDEN, "Sweetbook webhook signature is invalid");
		}
	}

	private long parseTimestampSeconds(String rawTimestamp) {
		if (rawTimestamp == null || rawTimestamp.isBlank()) {
			throw new AppException(HttpStatus.FORBIDDEN, "Sweetbook webhook timestamp is invalid or too old");
		}
		try {
			return Long.parseLong(rawTimestamp.trim());
		} catch (NumberFormatException exception) {
			throw new AppException(HttpStatus.FORBIDDEN, "Sweetbook webhook timestamp is invalid or too old", exception);
		}
	}

	private String signPayload(String secret, String message) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
			byte[] digest = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
			return "sha256=" + toHex(digest);
		} catch (Exception exception) {
			throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to verify Sweetbook webhook signature", exception);
		}
	}

	private boolean secureEquals(String expected, String actual) {
		return java.security.MessageDigest.isEqual(
			expected.getBytes(StandardCharsets.UTF_8),
			actual.getBytes(StandardCharsets.UTF_8)
		);
	}

	private String toHex(byte[] bytes) {
		StringBuilder builder = new StringBuilder(bytes.length * 2);
		for (byte value : bytes) {
			builder.append(Character.forDigit((value >> 4) & 0xF, 16));
			builder.append(Character.forDigit(value & 0xF, 16));
		}
		return builder.toString();
	}
}
