package com.privateedition.api;

import com.privateedition.application.YouTubeCommands;
import com.privateedition.application.YouTubeService;
import com.privateedition.application.YouTubeViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.ZoneOffset;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "YouTube")
@RestController
@RequestMapping("/api/youtube")
@RequiredArgsConstructor
public class YouTubeController {

	private final YouTubeService youTubeService;

	@Operation(summary = "Build Google OAuth URL")
	@GetMapping("/auth-url")
	public YouTubeViews.AuthUrl getAuthUrl(HttpSession session) {
		return youTubeService.getAuthUrl(session);
	}

	@Operation(summary = "Check whether YouTube OAuth is available")
	@GetMapping("/availability")
	public YouTubeViews.Availability getAvailability() {
		return youTubeService.getAvailability();
	}

	@Operation(summary = "Exchange Google OAuth code and store session tokens")
	@PostMapping("/callback")
	public YouTubeViews.Connection handleCallback(@Valid @RequestBody YouTubeCallbackRequest request, HttpSession session) {
		return youTubeService.handleCallback(request.toCommand(), session);
	}

	@Operation(summary = "List the connected user's subscriptions")
	@GetMapping("/subscriptions")
	public List<YoutubeChannelResponse> getSubscriptions(HttpSession session) {
		return youTubeService.getSubscriptions(session).stream()
			.map(YoutubeChannelResponse::from)
			.toList();
	}

	@Operation(summary = "Get a YouTube channel detail")
	@GetMapping("/channels/{channelId}")
	public YouTubeViews.ChannelDetail getChannelDetail(@PathVariable String channelId, HttpSession session) {
		return youTubeService.getChannelDetail(channelId, session);
	}

	@Operation(summary = "Get top videos for a channel")
	@GetMapping("/channels/{channelId}/top-videos")
	public List<YoutubeVideoResponse> getTopVideos(
		@PathVariable String channelId,
		@RequestParam(defaultValue = "5") int limit,
		HttpSession session
	) {
		return youTubeService.getTopVideos(channelId, limit, session).stream()
			.map(YoutubeVideoResponse::from)
			.toList();
	}

	@Operation(summary = "Analyze a selected channel into recap data")
	@PostMapping("/analyze")
	public YouTubeViews.AnalyzeResult analyze(@Valid @RequestBody AnalyzeChannelRequest request, HttpSession session) {
		return youTubeService.analyzeChannel(request.toCommand(), session);
	}
}

record YoutubeChannelResponse(
	String channelId,
	String title,
	String thumbnailUrl,
	String subscribedAt
) {
	static YoutubeChannelResponse from(YouTubeViews.Subscription subscription) {
		return new YoutubeChannelResponse(
			subscription.channelId(),
			subscription.title(),
			subscription.thumbnailUrl(),
			subscription.subscribedAt().atOffset(ZoneOffset.UTC).toLocalDate().toString()
		);
	}
}

record YoutubeVideoResponse(
	String videoId,
	String title,
	String thumbnailUrl,
	long viewCount,
	String publishedAt
) {
	static YoutubeVideoResponse from(YouTubeViews.VideoDetail video) {
		return new YoutubeVideoResponse(
			video.videoId(),
			video.title(),
			video.thumbnailUrl(),
			video.viewCount(),
			video.publishedAt().atOffset(ZoneOffset.UTC).toLocalDate().toString()
		);
	}
}

record YouTubeCallbackRequest(
	@NotBlank String code,
	@NotBlank String state
) {
	YouTubeCommands.OAuthCallback toCommand() {
		return new YouTubeCommands.OAuthCallback(code, state);
	}
}

record AnalyzeChannelRequest(
	@NotBlank String channelId,
	@NotBlank @Size(max = 30) String fanNickname,
	String favoriteVideoId,
	@Size(max = 240) String fanNote
) {
	YouTubeCommands.AnalyzeChannel toCommand() {
		return new YouTubeCommands.AnalyzeChannel(channelId, fanNickname, favoriteVideoId, fanNote);
	}
}
