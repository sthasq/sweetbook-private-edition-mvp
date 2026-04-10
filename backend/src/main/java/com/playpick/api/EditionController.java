package com.playpick.api;

import com.playpick.application.EditionService;
import com.playpick.application.EditionViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Editions")
@RestController
@RequestMapping("/api/editions")
@RequiredArgsConstructor
public class EditionController {

	private final EditionService editionService;

	@Operation(summary = "List published editions")
	@GetMapping
	public List<EditionSummaryResponse> listPublishedEditions() {
		return editionService.listPublishedEditions().stream()
			.map(EditionSummaryResponse::from)
			.toList();
	}

	@Operation(summary = "Get edition detail")
	@GetMapping("/{editionId}")
	public EditionViews.Detail getEdition(@PathVariable Long editionId) {
		return editionService.getEdition(editionId);
	}
}

record EditionSummaryResponse(
	Long id,
	String title,
	String subtitle,
	String creatorName,
	String creatorHandle,
	boolean isVerified
) {
	static EditionSummaryResponse from(EditionViews.Summary summary) {
		return new EditionSummaryResponse(
			summary.id(),
			summary.title(),
			summary.subtitle(),
			summary.creator().displayName(),
			summary.creator().channelHandle(),
			summary.creator().verified()
		);
	}
}
