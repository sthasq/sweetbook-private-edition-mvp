package com.playpick.application;

import java.util.Map;

public final class SweetbookViews {

	private SweetbookViews() {
	}

	public record BookSpec(
		String uid,
		String name,
		Integer minPages,
		Integer maxPages,
		Integer pageIncrement
	) {
	}

	public record Template(
		String uid,
		String name,
		String category,
		String role,
		String thumbnailUrl
	) {
	}

	public record TemplateDetail(
		String uid,
		String name,
		String category,
		String role,
		String theme,
		String thumbnailUrl,
		Map<String, Object> parameters,
		Map<String, Object> layout,
		Map<String, Object> layoutRules,
		Map<String, Object> baseLayer
	) {
	}

	public record IntegrationStatus(
		String mode,
		boolean liveEnabled,
		String label
	) {
	}
}
