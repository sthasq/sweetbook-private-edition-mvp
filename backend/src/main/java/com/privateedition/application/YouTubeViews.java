package com.privateedition.application;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class YouTubeViews {

	private YouTubeViews() {
	}

	public record AuthUrl(
		boolean enabled,
		String authUrl,
		String state
	) {
	}

	public record Connection(
		boolean connected,
		String message
	) {
	}

	public record Subscription(
		String channelId,
		String title,
		String thumbnailUrl,
		Instant subscribedAt
	) {
	}

	public record ChannelDetail(
		String channelId,
		String title,
		String description,
		String bannerUrl,
		String thumbnailUrl,
		String uploadsPlaylistId,
		long subscriberCount,
		long videoCount,
		long viewCount
	) {
	}

	public record VideoDetail(
		String videoId,
		String title,
		String thumbnailUrl,
		long viewCount,
		Instant publishedAt,
		String watchUrl
	) {
	}

	public record AnalyzeResult(
		ChannelDetail channel,
		List<VideoDetail> topVideos,
		Map<String, Object> personalizationData
	) {
	}
}
