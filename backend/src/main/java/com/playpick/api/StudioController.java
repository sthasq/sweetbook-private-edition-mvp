package com.playpick.api;

import com.playpick.application.EditionCommands;
import com.playpick.application.EditionService;
import com.playpick.application.EditionViews;
import com.playpick.domain.CuratedAssetType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Studio")
@RestController
@RequestMapping("/api/studio/editions")
@RequiredArgsConstructor
public class StudioController {

	private final EditionService editionService;

	@Operation(summary = "Create a studio edition draft")
	@PostMapping
	public EditionViews.Detail createEdition(@Valid @RequestBody StudioEditionRequest request) {
		return editionService.createEdition(request.toCommand());
	}

	@Operation(summary = "Update a studio edition draft")
	@PatchMapping("/{editionId}")
	public EditionViews.Detail updateEdition(@PathVariable Long editionId, @Valid @RequestBody StudioEditionRequest request) {
		return editionService.updateEdition(editionId, request.toCommand());
	}

	@Operation(summary = "Publish an edition and freeze a new snapshot")
	@PostMapping("/{editionId}/publish")
	public EditionViews.Detail publishEdition(@PathVariable Long editionId) {
		return editionService.publishEdition(editionId);
	}
}

record StudioEditionRequest(
	@NotBlank @Size(max = 200) String title,
	@Size(max = 255) String subtitle,
	@NotBlank String coverImageUrl,
	String bookSpecUid,
	String sweetbookCoverTemplateUid,
	String sweetbookPublishTemplateUid,
	String sweetbookContentTemplateUid,
	Map<String, Object> officialIntro,
	Map<String, Object> officialClosing,
	@Valid List<StudioCuratedAssetRequest> curatedAssets,
	@Valid List<StudioPersonalizationFieldRequest> personalizationFields
) {
	EditionCommands.StudioEdition toCommand() {
		return new EditionCommands.StudioEdition(
			title,
			subtitle,
			coverImageUrl,
			bookSpecUid,
			sweetbookCoverTemplateUid,
			sweetbookPublishTemplateUid,
			sweetbookContentTemplateUid,
			officialIntro,
			officialClosing,
			curatedAssets == null ? List.of() : curatedAssets.stream().map(StudioCuratedAssetRequest::toCommand).toList(),
			personalizationFields == null ? List.of() : personalizationFields.stream().map(StudioPersonalizationFieldRequest::toCommand).toList()
		);
	}
}

record StudioCuratedAssetRequest(
	@NotNull CuratedAssetType assetType,
	@NotBlank String title,
	@NotBlank String content,
	@NotNull Integer sortOrder
) {
	EditionCommands.CuratedAssetInput toCommand() {
		return new EditionCommands.CuratedAssetInput(assetType, title, content, sortOrder);
	}
}

record StudioPersonalizationFieldRequest(
	@NotBlank String fieldKey,
	@NotBlank String label,
	@NotBlank String inputType,
	boolean required,
	Integer maxLength,
	@NotNull Integer sortOrder
) {
	EditionCommands.PersonalizationFieldInput toCommand() {
		return new EditionCommands.PersonalizationFieldInput(fieldKey, label, inputType, required, maxLength, sortOrder);
	}
}
