package com.privateedition.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.privateedition.config.GoogleProperties;
import com.privateedition.infrastructure.youtube.YouTubeClient;
import jakarta.servlet.http.HttpSession;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
public class YouTubeService {

	private static final String YOUTUBE_STATE_KEY = "youtube_oauth_state";
	private static final String YOUTUBE_TOKEN_KEY = "youtube_oauth_tokens";

	private final GoogleProperties googleProperties;
	private final YouTubeClient youTubeClient;

	public YouTubeViews.Availability getAvailability() {
		return new YouTubeViews.Availability(googleProperties.isConfigured());
	}

	public YouTubeViews.AuthUrl getAuthUrl(HttpSession session) {
		if (!googleProperties.isConfigured()) {
			return new YouTubeViews.AuthUrl(false, null, null);
		}

		String state = UUID.randomUUID().toString();
		session.setAttribute(YOUTUBE_STATE_KEY, state);

		String authUrl = UriComponentsBuilder.fromUri(URI.create("https://accounts.google.com/o/oauth2/v2/auth"))
			.queryParam("client_id", googleProperties.getClientId())
			.queryParam("redirect_uri", googleProperties.getRedirectUri())
			.queryParam("response_type", "code")
			.queryParam("scope", "https://www.googleapis.com/auth/youtube.readonly")
			.queryParam("access_type", "offline")
			.queryParam("include_granted_scopes", "true")
			.queryParam("state", state)
			.build()
			.toUriString();

		return new YouTubeViews.AuthUrl(true, authUrl, state);
	}

	public YouTubeViews.Connection handleCallback(YouTubeCommands.OAuthCallback callback, HttpSession session) {
		String expectedState = (String) session.getAttribute(YOUTUBE_STATE_KEY);
		if (expectedState == null || !expectedState.equals(callback.state())) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Invalid OAuth state");
		}

		Map<String, Object> tokens = youTubeClient.exchangeCode(callback.code(), googleProperties);
		session.setAttribute(YOUTUBE_TOKEN_KEY, tokens);
		return new YouTubeViews.Connection(true, "YouTube connection stored in session");
	}

	public List<YouTubeViews.Subscription> getSubscriptions(HttpSession session) {
		String accessToken = requireAccessToken(session);
		JsonNode response = youTubeClient.getYouTubeResource("/youtube/v3/subscriptions", Map.of(
			"part", "snippet",
			"mine", "true",
			"maxResults", "50"
		), accessToken, null);

		List<YouTubeViews.Subscription> subscriptions = new ArrayList<>();
		for (JsonNode item : response.path("items")) {
			JsonNode snippet = item.path("snippet");
			JsonNode resourceId = snippet.path("resourceId");
			subscriptions.add(new YouTubeViews.Subscription(
				resourceId.path("channelId").asText(),
				snippet.path("title").asText(),
				snippet.path("thumbnails").path("default").path("url").asText(""),
				parseInstant(snippet.path("publishedAt").asText())
			));
		}
		return subscriptions;
	}

	public YouTubeViews.ChannelDetail getChannelDetail(String channelId, HttpSession session) {
		Credential credential = resolveCredential(session);
		JsonNode response = youTubeClient.getYouTubeResource("/youtube/v3/channels", Map.of(
			"part", "snippet,statistics,brandingSettings,contentDetails",
			"id", channelId
		), credential.accessToken(), credential.apiKey());

		JsonNode item = response.path("items").path(0);
		if (item.isMissingNode()) {
			throw new AppException(HttpStatus.NOT_FOUND, "YouTube channel not found: " + channelId);
		}

		return new YouTubeViews.ChannelDetail(
			channelId,
			item.path("snippet").path("title").asText(),
			item.path("snippet").path("description").asText(""),
			item.path("brandingSettings").path("image").path("bannerExternalUrl").asText(""),
			item.path("snippet").path("thumbnails").path("high").path("url").asText(""),
			item.path("contentDetails").path("relatedPlaylists").path("uploads").asText(""),
			item.path("statistics").path("subscriberCount").asLong(0L),
			item.path("statistics").path("videoCount").asLong(0L),
			item.path("statistics").path("viewCount").asLong(0L)
		);
	}

	public List<YouTubeViews.VideoDetail> getTopVideos(String channelId, int limit, HttpSession session) {
		YouTubeViews.ChannelDetail channel = getChannelDetail(channelId, session);
		Credential credential = resolveCredential(session);
		JsonNode playlistResponse = youTubeClient.getYouTubeResource("/youtube/v3/playlistItems", Map.of(
			"part", "contentDetails",
			"playlistId", channel.uploadsPlaylistId(),
			"maxResults", String.valueOf(Math.max(limit, 5))
		), credential.accessToken(), credential.apiKey());

		List<String> videoIds = new ArrayList<>();
		for (JsonNode item : playlistResponse.path("items")) {
			String videoId = item.path("contentDetails").path("videoId").asText("");
			if (!videoId.isBlank()) {
				videoIds.add(videoId);
			}
		}

		if (videoIds.isEmpty()) {
			return List.of();
		}

		JsonNode videosResponse = youTubeClient.getYouTubeResource("/youtube/v3/videos", Map.of(
			"part", "snippet,statistics",
			"id", String.join(",", videoIds)
		), credential.accessToken(), credential.apiKey());

		List<YouTubeViews.VideoDetail> videos = new ArrayList<>();
		for (JsonNode item : videosResponse.path("items")) {
			String videoId = item.path("id").asText();
			videos.add(new YouTubeViews.VideoDetail(
				videoId,
				item.path("snippet").path("title").asText(""),
				item.path("snippet").path("thumbnails").path("high").path("url").asText(""),
				item.path("statistics").path("viewCount").asLong(0L),
				parseInstant(item.path("snippet").path("publishedAt").asText()),
				"https://www.youtube.com/watch?v=" + videoId
			));
		}

		return videos.stream()
			.sorted((left, right) -> Long.compare(right.viewCount(), left.viewCount()))
			.limit(limit)
			.toList();
	}

	public YouTubeViews.AnalyzeResult analyzeChannel(YouTubeCommands.AnalyzeChannel command, HttpSession session) {
		List<YouTubeViews.Subscription> subscriptions = getSubscriptions(session);
		YouTubeViews.Subscription subscription = subscriptions.stream()
			.filter(item -> item.channelId().equals(command.channelId()))
			.findFirst()
			.orElse(null);
		YouTubeViews.ChannelDetail channel = getChannelDetail(command.channelId(), session);
		List<YouTubeViews.VideoDetail> topVideos = getTopVideos(command.channelId(), 5, session);

		Instant subscribedAt = subscription == null ? Instant.now() : subscription.subscribedAt();
		long daysTogether = Math.max(0, ChronoUnit.DAYS.between(
			LocalDate.ofInstant(subscribedAt, ZoneOffset.UTC),
			LocalDate.now(ZoneOffset.UTC)
		));
		String favoriteVideoId = command.favoriteVideoId();
		if ((favoriteVideoId == null || favoriteVideoId.isBlank()) && !topVideos.isEmpty()) {
			favoriteVideoId = topVideos.get(0).videoId();
		}

		Map<String, Object> personalizationData = new LinkedHashMap<>();
		personalizationData.put("mode", "youtube");
		personalizationData.put("fanNickname", command.fanNickname());
		personalizationData.put("subscribedSince", subscribedAt.toString());
		personalizationData.put("daysTogether", daysTogether);
		personalizationData.put("favoriteVideoId", favoriteVideoId);
		personalizationData.put("fanNote", command.fanNote());
		personalizationData.put("channel", Map.of(
			"channelId", channel.channelId(),
			"title", channel.title(),
			"subscriberCount", String.valueOf(channel.subscriberCount()),
			"thumbnailUrl", channel.thumbnailUrl(),
			"bannerUrl", channel.bannerUrl()
		));
		personalizationData.put("topVideos", topVideos.stream().map(video -> Map.of(
			"videoId", video.videoId(),
			"title", video.title(),
			"thumbnailUrl", video.thumbnailUrl(),
			"viewCount", video.viewCount(),
			"publishedAt", video.publishedAt().toString()
		)).toList());

		return new YouTubeViews.AnalyzeResult(channel, topVideos, personalizationData);
	}

	private Credential resolveCredential(HttpSession session) {
		Map<String, Object> tokenMap = readTokenMap(session);
		String accessToken = tokenMap == null ? null : String.valueOf(tokenMap.getOrDefault("access_token", ""));
		if (accessToken != null && !accessToken.isBlank()) {
			return new Credential(accessToken, null);
		}
		if (googleProperties.hasApiKey()) {
			return new Credential(null, googleProperties.getApiKey());
		}
		throw new AppException(HttpStatus.BAD_REQUEST, "Google OAuth tokens or YOUTUBE_API_KEY are required");
	}

	private String requireAccessToken(HttpSession session) {
		Map<String, Object> tokenMap = readTokenMap(session);
		if (tokenMap == null) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "YouTube session not connected");
		}
		String accessToken = String.valueOf(tokenMap.getOrDefault("access_token", ""));
		if (accessToken.isBlank()) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "YouTube access token missing");
		}
		return accessToken;
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> readTokenMap(HttpSession session) {
		Object value = session.getAttribute(YOUTUBE_TOKEN_KEY);
		if (value instanceof Map<?, ?> map) {
			Map<String, Object> result = new LinkedHashMap<>();
			map.forEach((key, object) -> result.put(String.valueOf(key), object));
			return result;
		}
		return null;
	}

	private Instant parseInstant(String rawValue) {
		if (rawValue == null || rawValue.isBlank()) {
			return Instant.now();
		}
		return Instant.parse(rawValue);
	}

	private record Credential(String accessToken, String apiKey) {
	}
}
