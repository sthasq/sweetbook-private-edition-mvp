package com.playpick.application;

import com.playpick.domain.CuratedAssetType;
import java.util.List;
import java.util.Map;

public final class EditionCommands {

	private EditionCommands() {
	}

	public record StudioEdition(
		String title,
		String subtitle,
		String coverImageUrl,
		String bookSpecUid,
		String sweetbookCoverTemplateUid,
		String sweetbookPublishTemplateUid,
		String sweetbookContentTemplateUid,
		Map<String, Object> officialIntro,
		Map<String, Object> officialClosing,
		List<CuratedAssetInput> curatedAssets,
		List<PersonalizationFieldInput> personalizationFields
	) {
	}

	public record CuratedAssetInput(
		CuratedAssetType assetType,
		String title,
		String content,
		Integer sortOrder
	) {
	}

	public record PersonalizationFieldInput(
		String fieldKey,
		String label,
		String inputType,
		boolean required,
		Integer maxLength,
		Integer sortOrder
	) {
	}
}
