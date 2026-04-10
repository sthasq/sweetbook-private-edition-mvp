package com.privateedition.application;

public final class SweetbookViews {

	private SweetbookViews() {
	}

	public record BookSpec(
		String uid,
		String name,
		Integer minPages,
		Integer maxPages
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
}
