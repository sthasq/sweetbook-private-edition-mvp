package com.privateedition.application;

public final class YouTubeCommands {

	private YouTubeCommands() {
	}

	public record OAuthCallback(String code, String state) {
	}

	public record AnalyzeChannel(
		String channelId,
		String fanNickname,
		String favoriteVideoId,
		String fanNote
	) {
	}
}
