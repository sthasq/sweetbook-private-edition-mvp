package com.privateedition.api;

import com.privateedition.application.YouTubeService;
import com.privateedition.application.YouTubeViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Studio")
@RestController
@RequestMapping("/api/studio")
@RequiredArgsConstructor
public class StudioYouTubeController {

	private final YouTubeService youTubeService;

	@Operation(summary = "Build curated recap assets from a YouTube channel source")
	@PostMapping("/youtube-recap")
	public YouTubeViews.StudioRecapResult buildRecap(
		@Valid @RequestBody StudioYouTubeRecapRequest request,
		HttpSession session
	) {
		return youTubeService.buildStudioRecap(request.source(), session);
	}
}

record StudioYouTubeRecapRequest(
	@NotBlank String source
) {
}
