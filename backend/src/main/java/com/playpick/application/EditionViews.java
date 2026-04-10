package com.playpick.application;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class EditionViews {

	private EditionViews() {
	}

	public record Summary(
		Long id,
		String title,
		String subtitle,
		String coverImageUrl,
		String status,
		Creator creator,
		Instant updatedAt,
		Snapshot snapshot
	) {
	}

	public record Detail(
		Long id,
		String title,
		String subtitle,
		String coverImageUrl,
		String status,
		Creator creator,
		Snapshot snapshot,
		Instant createdAt,
		Instant updatedAt
	) {
	}

	public record Creator(
		Long id,
		String displayName,
		String channelHandle,
		String avatarUrl,
		boolean verified
	) {
	}

	public record Snapshot(
		Long id,
		Integer versionNumber,
		String bookSpecUid,
		String sweetbookCoverTemplateUid,
		String sweetbookPublishTemplateUid,
		String sweetbookContentTemplateUid,
		Map<String, Object> officialIntro,
		Map<String, Object> officialClosing,
		Instant approvedAt,
		List<CuratedAsset> curatedAssets,
		List<PersonalizationField> personalizationFields
	) {
	}

	public record CuratedAsset(
		Long id,
		String assetType,
		String title,
		String content,
		Integer sortOrder
	) {
	}

	public record PersonalizationField(
		Long id,
		String fieldKey,
		String label,
		String inputType,
		boolean required,
		Integer maxLength,
		Integer sortOrder
	) {
	}
}
