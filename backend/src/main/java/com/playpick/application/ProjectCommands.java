package com.playpick.application;

import java.util.Map;

public final class ProjectCommands {

	private ProjectCommands() {
	}

	public record CreateProject(
		Long editionId,
		String mode,
		Map<String, Object> personalizationData
	) {
	}

	public record UpdateProject(
		Map<String, Object> personalizationData
	) {
	}

	public record ChatMessage(
		String role,
		String content
	) {
	}

	public record Shipping(
		String recipientName,
		String recipientPhone,
		String postalCode,
		String address1,
		String address2,
		int quantity
	) {
	}

	public record PaymentConfirmation(
		String paymentKey,
		String orderId,
		long amount
	) {
	}
}
