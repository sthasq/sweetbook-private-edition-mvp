package com.playpick.application;

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

	public record IntegrationStatus(
		String mode,
		boolean liveEnabled,
		String label
	) {
	}
}
