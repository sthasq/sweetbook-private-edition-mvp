package com.playpick.application;

final class SweetbookTemplateCopyPolicy {

	static final String INFLUENCER_PLACEHOLDER = "인플루언서가 채워넣는 문구입니다.";

	static final int PHOTO_STORY_TITLE_MAX = 18;
	static final int PHOTO_STORY_BODY_MAX = 28;
	static final int TEXT_STORY_TITLE_MAX = 20;
	static final int TEXT_STORY_BODY_MAX = 84;
	static final int GALLERY_TITLE_MAX = 14;
	static final int GALLERY_BODY_MAX = 24;

	private SweetbookTemplateCopyPolicy() {
	}

	static PageCopy limitStoryPage(String title, String description, boolean textOnly) {
		return textOnly
			? new PageCopy(
				truncateInline(title, TEXT_STORY_TITLE_MAX),
				truncateInline(description, TEXT_STORY_BODY_MAX)
			)
			: new PageCopy(
				truncateInline(title, PHOTO_STORY_TITLE_MAX),
				truncateInline(description, PHOTO_STORY_BODY_MAX)
			);
	}

	static PageCopy limitGalleryPage(String title, String description) {
		return new PageCopy(
			truncateInline(title, GALLERY_TITLE_MAX),
			truncateInline(description, GALLERY_BODY_MAX)
		);
	}

	static String photoStoryTitle(String title) {
		return truncateInline(title, PHOTO_STORY_TITLE_MAX);
	}

	static String photoStoryBody(String description, String fallbackText) {
		return truncateInline(firstNonBlank(description, fallbackText), PHOTO_STORY_BODY_MAX);
	}

	static String textStoryTitle(String title) {
		return truncateInline(title, TEXT_STORY_TITLE_MAX);
	}

	static String textStoryBody(String description, String fallbackText) {
		return truncateInline(firstNonBlank(description, fallbackText), TEXT_STORY_BODY_MAX);
	}

	private static String truncateInline(String value, int maxLength) {
		String normalized = normalizeInline(value);
		if (normalized.isEmpty() || normalized.length() <= maxLength) {
			return normalized;
		}
		if (maxLength <= 3) {
			return normalized.substring(0, maxLength);
		}
		return normalized.substring(0, maxLength - 3).trim() + "...";
	}

	private static String normalizeInline(String value) {
		if (value == null) {
			return "";
		}
		return value
			.replaceAll("\\s+", " ")
			.trim();
	}

	private static String firstNonBlank(String primary, String fallback) {
		String normalizedPrimary = normalizeInline(primary);
		if (!normalizedPrimary.isEmpty()) {
			return normalizedPrimary;
		}
		return normalizeInline(fallback);
	}

	record PageCopy(String title, String description) {
	}
}
