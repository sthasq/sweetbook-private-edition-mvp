package com.privateedition.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.privateedition.config.GoogleProperties;
import com.privateedition.infrastructure.youtube.YouTubeClient;
import jakarta.servlet.http.HttpSession;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
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
	private static final HttpClient PUBLIC_YOUTUBE_HTTP = HttpClient.newBuilder()
		.followRedirects(HttpClient.Redirect.NORMAL)
		.connectTimeout(Duration.ofSeconds(10))
		.build();

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

	public YouTubeViews.StudioRecapResult buildStudioRecap(String source, HttpSession session) {
		String channelId = resolveChannelId(source, session);
		YouTubeViews.ChannelDetail channel = getChannelDetail(channelId, session);
		List<YouTubeViews.VideoDetail> yearlyVideos = getRecentYearVideos(channel, session);
		List<YouTubeViews.VideoDetail> topVideos = yearlyVideos.stream()
			.sorted(Comparator.comparingLong(YouTubeViews.VideoDetail::viewCount).reversed())
			.limit(5)
			.toList();

		if (topVideos.isEmpty()) {
			topVideos = getTopVideos(channelId, 5, session);
		}

		YouTubeViews.StudioYearlySummary yearlySummary = summarizeYearlyVideos(yearlyVideos);
		List<YouTubeViews.StudioCuratedAssetSuggestion> curatedAssets = buildStudioCuratedAssets(
			channel,
			topVideos,
			yearlySummary
		);

		return new YouTubeViews.StudioRecapResult(channel, topVideos, yearlySummary, curatedAssets);
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

	private String resolveChannelId(String source, HttpSession session) {
		String normalized = source == null ? "" : source.trim();
		if (normalized.isBlank()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "YouTube 링크나 채널 정보를 입력해 주세요.");
		}
		String decoded = decodeSource(normalized);

		String directChannelId = extractChannelId(normalized);
		if (!directChannelId.isBlank()) {
			return directChannelId;
		}
		directChannelId = extractChannelId(decoded);
		if (!directChannelId.isBlank()) {
			return directChannelId;
		}

		String videoId = extractVideoId(normalized);
		if (!videoId.isBlank()) {
			return resolveChannelIdFromVideo(videoId, session);
		}
		videoId = extractVideoId(decoded);
		if (!videoId.isBlank()) {
			return resolveChannelIdFromVideo(videoId, session);
		}

		String channelUrl = extractPublicChannelUrl(decoded);
		if (!channelUrl.isBlank()) {
			return resolveChannelIdFromPublicUrl(channelUrl);
		}

		String handle = extractHandle(decoded);
		if (!handle.isBlank()) {
			return resolveChannelIdFromPublicUrl("https://www.youtube.com/@" + handle.replaceFirst("^@", ""));
		}

		return searchChannelId(decoded, session);
	}

	private String decodeSource(String source) {
		if (!source.contains("%")) {
			return source;
		}
		try {
			return URLDecoder.decode(source, StandardCharsets.UTF_8);
		} catch (IllegalArgumentException exception) {
			return source;
		}
	}

	private String extractChannelId(String source) {
		String trimmed = source.trim();
		if (trimmed.matches("UC[\\w-]{10,}")) {
			return trimmed;
		}

		var matcher = java.util.regex.Pattern.compile("(?:youtube\\.com/channel/)(UC[\\w-]{10,})")
			.matcher(trimmed);
		if (matcher.find()) {
			return matcher.group(1);
		}
		return "";
	}

	private String extractHandle(String source) {
		String trimmed = source.trim();
		if (trimmed.startsWith("@") && trimmed.length() > 1) {
			return trimmed.substring(1);
		}

		var matcher = java.util.regex.Pattern.compile("(?:youtube\\.com/)?@([A-Za-z0-9._-]+)")
			.matcher(trimmed);
		if (matcher.find()) {
			return matcher.group(1);
		}

		var customUrlMatcher = java.util.regex.Pattern.compile("youtube\\.com/(?:c|user)/([^/?#]+)")
			.matcher(trimmed);
		if (customUrlMatcher.find()) {
			return customUrlMatcher.group(1);
		}

		return "";
	}

	private String extractPublicChannelUrl(String source) {
		String trimmed = source.trim();
		var matcher = java.util.regex.Pattern.compile(
			"(?i)((?:https?://)?(?:www\\.)?youtube\\.com/(?:@[^/?#\\s]+|c/[^/?#\\s]+|user/[^/?#\\s]+|channel/UC[\\w-]{10,}))"
		).matcher(trimmed);
		if (!matcher.find()) {
			return "";
		}

		String rawUrl = matcher.group(1);
		return rawUrl.startsWith("http") ? rawUrl : "https://" + rawUrl;
	}

	private String extractVideoId(String source) {
		String[] patterns = {
			"[?&]v=([A-Za-z0-9_-]{6,})",
			"youtu\\.be/([A-Za-z0-9_-]{6,})",
			"embed/([A-Za-z0-9_-]{6,})",
			"shorts/([A-Za-z0-9_-]{6,})"
		};
		for (String pattern : patterns) {
			var matcher = java.util.regex.Pattern.compile(pattern).matcher(source);
			if (matcher.find()) {
				return matcher.group(1);
			}
		}
		return "";
	}

	private String resolveChannelIdFromVideo(String videoId, HttpSession session) {
		Credential credential = resolveCredential(session);
		JsonNode response = youTubeClient.getYouTubeResource("/youtube/v3/videos", Map.of(
			"part", "snippet",
			"id", videoId
		), credential.accessToken(), credential.apiKey());

		JsonNode item = response.path("items").path(0);
		String channelId = item.path("snippet").path("channelId").asText("");
		if (channelId.isBlank()) {
			throw new AppException(HttpStatus.NOT_FOUND, "영상에서 채널 정보를 찾을 수 없습니다.");
		}
		return channelId;
	}

	private String resolveChannelIdFromHandle(String handle, HttpSession session) {
		Credential credential = resolveCredential(session);
		JsonNode response = youTubeClient.getYouTubeResource("/youtube/v3/channels", Map.of(
			"part", "snippet",
			"forHandle", handle.replaceFirst("^@", "")
		), credential.accessToken(), credential.apiKey());

		JsonNode item = response.path("items").path(0);
		String channelId = item.path("id").asText("");
		if (!channelId.isBlank()) {
			return channelId;
		}

		return searchChannelId(handle, session);
	}

	private String resolveChannelIdFromPublicUrl(String url) {
		try {
			URI requestUri = UriComponentsBuilder.fromUriString(url).build().encode().toUri();
			HttpRequest request = HttpRequest.newBuilder(requestUri)
				.timeout(Duration.ofSeconds(15))
				.header("User-Agent", "Mozilla/5.0 PrivateEditionBot/1.0")
				.GET()
				.build();
			HttpResponse<String> response = PUBLIC_YOUTUBE_HTTP.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() >= 400) {
				throw new AppException(HttpStatus.NOT_FOUND, "입력한 링크에서 YouTube 채널 정보를 찾지 못했습니다.");
			}

			String html = response.body();
			var channelIdMatcher = java.util.regex.Pattern.compile("\"channelId\":\"(UC[^\"]+)\"").matcher(html);
			if (channelIdMatcher.find()) {
				return channelIdMatcher.group(1);
			}

			var canonicalMatcher = java.util.regex.Pattern.compile("https://www\\.youtube\\.com/channel/(UC[A-Za-z0-9_-]+)").matcher(html);
			if (canonicalMatcher.find()) {
				return canonicalMatcher.group(1);
			}

			var browseIdMatcher = java.util.regex.Pattern.compile("\"browseId\":\"(UC[A-Za-z0-9_-]+)\"").matcher(html);
			if (browseIdMatcher.find()) {
				return browseIdMatcher.group(1);
			}
		} catch (AppException exception) {
			throw exception;
		} catch (Exception exception) {
			throw new AppException(HttpStatus.BAD_GATEWAY, "YouTube 채널 링크를 해석하지 못했습니다.", exception);
		}

		throw new AppException(HttpStatus.NOT_FOUND, "입력한 링크에서 YouTube 채널 정보를 찾지 못했습니다.");
	}

	private String searchChannelId(String query, HttpSession session) {
		Credential credential = resolveCredential(session);
		JsonNode response = youTubeClient.getYouTubeResource("/youtube/v3/search", Map.of(
			"part", "snippet",
			"type", "channel",
			"q", query,
			"maxResults", "1"
		), credential.accessToken(), credential.apiKey());

		JsonNode item = response.path("items").path(0);
		String channelId = item.path("snippet").path("channelId").asText("");
		if (channelId.isBlank()) {
			channelId = item.path("id").path("channelId").asText("");
		}
		if (channelId.isBlank()) {
			throw new AppException(HttpStatus.NOT_FOUND, "입력한 정보로 YouTube 채널을 찾지 못했습니다.");
		}
		return channelId;
	}

	private List<YouTubeViews.VideoDetail> getRecentYearVideos(YouTubeViews.ChannelDetail channel, HttpSession session) {
		Credential credential = resolveCredential(session);
		Instant cutoff = Instant.now().minus(365, ChronoUnit.DAYS);
		String pageToken = null;
		List<YouTubeViews.VideoDetail> recentVideos = new ArrayList<>();
		LinkedHashSet<String> seenVideoIds = new LinkedHashSet<>();

		for (int page = 0; page < 6; page++) {
			Map<String, String> query = new LinkedHashMap<>();
			query.put("part", "contentDetails");
			query.put("playlistId", channel.uploadsPlaylistId());
			query.put("maxResults", "50");
			if (pageToken != null && !pageToken.isBlank()) {
				query.put("pageToken", pageToken);
			}

			JsonNode playlistResponse = youTubeClient.getYouTubeResource(
				"/youtube/v3/playlistItems",
				query,
				credential.accessToken(),
				credential.apiKey()
			);

			List<String> videoIds = new ArrayList<>();
			for (JsonNode item : playlistResponse.path("items")) {
				String videoId = item.path("contentDetails").path("videoId").asText("");
				if (!videoId.isBlank() && seenVideoIds.add(videoId)) {
					videoIds.add(videoId);
				}
			}

			List<YouTubeViews.VideoDetail> pageVideos = loadVideoDetails(videoIds, credential);
			for (YouTubeViews.VideoDetail video : pageVideos) {
				if (!video.publishedAt().isBefore(cutoff)) {
					recentVideos.add(video);
				}
			}

			Instant oldestPublishedAt = pageVideos.stream()
				.map(YouTubeViews.VideoDetail::publishedAt)
				.min(Comparator.naturalOrder())
				.orElse(Instant.now());
			pageToken = playlistResponse.path("nextPageToken").asText("");
			if (pageToken.isBlank() || oldestPublishedAt.isBefore(cutoff)) {
				break;
			}
		}

		return recentVideos;
	}

	private List<YouTubeViews.VideoDetail> loadVideoDetails(List<String> videoIds, Credential credential) {
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

		return videos;
	}

	private YouTubeViews.StudioYearlySummary summarizeYearlyVideos(List<YouTubeViews.VideoDetail> videos) {
		long uploadCount = videos.size();
		long totalViews = videos.stream().mapToLong(YouTubeViews.VideoDetail::viewCount).sum();
		long averageViewsPerVideo = uploadCount == 0 ? 0 : totalViews / uploadCount;
		LocalDate currentMonth = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1);
		Map<String, long[]> monthlyStats = new LinkedHashMap<>();

		for (int offset = 11; offset >= 0; offset--) {
			LocalDate month = currentMonth.minusMonths(offset);
			monthlyStats.put(month.toString().substring(0, 7), new long[] {0L, 0L});
		}

		for (YouTubeViews.VideoDetail video : videos) {
			String monthKey = LocalDate.ofInstant(video.publishedAt(), ZoneOffset.UTC)
				.withDayOfMonth(1)
				.toString()
				.substring(0, 7);
			long[] stat = monthlyStats.get(monthKey);
			if (stat != null) {
				stat[0] += 1;
				stat[1] += video.viewCount();
			}
		}

		List<YouTubeViews.StudioMonthlyStat> monthly = monthlyStats.entrySet().stream()
			.map(entry -> new YouTubeViews.StudioMonthlyStat(entry.getKey(), entry.getValue()[0], entry.getValue()[1]))
			.toList();

		return new YouTubeViews.StudioYearlySummary(
			uploadCount,
			totalViews,
			averageViewsPerVideo,
			"최근 1년",
			monthly
		);
	}

	private List<YouTubeViews.StudioCuratedAssetSuggestion> buildStudioCuratedAssets(
		YouTubeViews.ChannelDetail channel,
		List<YouTubeViews.VideoDetail> topVideos,
		YouTubeViews.StudioYearlySummary yearlySummary
	) {
		List<YouTubeViews.StudioCuratedAssetSuggestion> assets = new ArrayList<>();
		String heroImage = channel.bannerUrl().isBlank() ? channel.thumbnailUrl() : channel.bannerUrl();

		if (!heroImage.isBlank()) {
			assets.add(new YouTubeViews.StudioCuratedAssetSuggestion(
				"IMAGE",
				channel.title() + " 채널 비주얼",
				heroImage,
				1
			));
		}

		assets.add(new YouTubeViews.StudioCuratedAssetSuggestion(
			"MESSAGE",
			"지난 1년 리캡",
			buildYearlyRecapMessage(channel, yearlySummary, topVideos),
			assets.size() + 1
		));

		for (YouTubeViews.VideoDetail video : topVideos.stream().limit(3).toList()) {
			assets.add(new YouTubeViews.StudioCuratedAssetSuggestion(
				"VIDEO",
				video.title(),
				video.watchUrl(),
				assets.size() + 1
			));
		}

		return assets;
	}

	private String buildYearlyRecapMessage(
		YouTubeViews.ChannelDetail channel,
		YouTubeViews.StudioYearlySummary yearlySummary,
		List<YouTubeViews.VideoDetail> topVideos
	) {
		StringBuilder builder = new StringBuilder();
		builder.append(channel.title())
			.append("의 최근 1년을 돌아보는 리캡입니다.\n")
			.append("업로드 ")
			.append(yearlySummary.uploadCount())
			.append("개, 총 조회수 ")
			.append(String.format("%,d", yearlySummary.totalViews()))
			.append("회를 기록했습니다.\n")
			.append("영상당 평균 조회수는 ")
			.append(String.format("%,d", yearlySummary.averageViewsPerVideo()))
			.append("회입니다.");

		if (!topVideos.isEmpty()) {
			builder.append("\n가장 주목받은 영상은 ");
			builder.append(topVideos.get(0).title());
			builder.append(" 입니다.");
		}

		return builder.toString();
	}

	private record Credential(String accessToken, String apiKey) {
	}
}
