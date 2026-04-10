package com.playpick.application;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ProjectPreviewAssembler {

	public ProjectViews.Preview assemble(ProjectViews.Snapshot project, EditionViews.Detail edition) {
		Map<String, Object> personalization = new LinkedHashMap<>(project.personalizationData());
		String mode = asString(personalization.get("mode"), "demo");
		String fanNickname = asNonBlankString(personalization.get("fanNickname"), "팬");
		Map<String, Object> channel = asMap(personalization.get("channel"));
		List<Map<String, Object>> topVideos = asListOfMaps(personalization.get("topVideos"));
		Map<String, Object> favoriteVideo = findFavoriteVideo(topVideos, asString(personalization.get("favoriteVideoId"), ""));

		List<ProjectViews.Page> pages = new ArrayList<>();
		pages.add(new ProjectViews.Page(
			"cover",
			edition.title(),
			"지금 공개 중인 드롭 · " + fanNickname + "님을 위한 한 권",
			edition.coverImageUrl(),
			Map.of(
				"fanNickname", fanNickname,
				"subtitle", edition.subtitle()
			)
		));

		pages.add(new ProjectViews.Page(
			"official-intro",
			asCopyText(edition.snapshot().officialIntro(), "title", "heading", "크리에이터 인사"),
			asCopyText(edition.snapshot().officialIntro(), "message", "body", ""),
			firstAssetImage(edition.snapshot().curatedAssets(), edition.coverImageUrl()),
			edition.snapshot().officialIntro()
		));

		String subscribedSince = asString(personalization.get("subscribedSince"), "");
		long daysTogether = asLong(personalization.get("daysTogether"), subscribedSince.isBlank() ? 0L : computeDaysTogether(subscribedSince));
		pages.add(new ProjectViews.Page(
			"relationship",
			subscribedSince.isBlank()
				? "처음 좋아한 그날부터"
				: "함께 보기 시작한 날 · " + subscribedSince.substring(0, Math.min(10, subscribedSince.length())),
			"함께한 " + daysTogether + "일 · " + asString(channel.get("title"), edition.creator().displayName()),
			asString(channel.get("bannerUrl"), edition.coverImageUrl()),
			Map.of(
				"daysTogether", daysTogether,
				"subscribedSince", subscribedSince,
				"channel", channel
			)
		));

		pages.add(new ProjectViews.Page(
			"top-videos",
			"자주 꺼내 본 장면",
			topVideos.stream()
				.limit(5)
				.map(video -> asNonBlankString(video.get("title"), "제목 없는 영상"))
				.reduce((left, right) -> left + " · " + right)
				.orElse("인기 영상 데이터를 불러오면 이 페이지가 채워집니다."),
			topVideos.isEmpty() ? edition.coverImageUrl() : asString(topVideos.get(0).get("thumbnailUrl"), edition.coverImageUrl()),
			Map.of("topVideos", topVideos)
		));

		pages.add(new ProjectViews.Page(
			"fan-pick",
			"내가 고른 장면",
			asNonBlankString(favoriteVideo.get("title"), "가장 좋아하는 장면"),
			asString(favoriteVideo.get("thumbnailUrl"), edition.coverImageUrl()),
			Map.of(
				"favoriteVideo", favoriteVideo,
				"favoriteReason", asString(personalization.get("favoriteReason"), ""),
				"fanNote", asString(personalization.get("fanNote"), "")
			)
		));

		String memoryImageUrl = asString(personalization.get("uploadedImageUrl"),
			asString(personalization.get("memoryImageUrl"), asString(channel.get("thumbnailUrl"), edition.coverImageUrl())));
		pages.add(new ProjectViews.Page(
			"fan-note",
			fanNickname + "님의 한마디",
			asNonBlankString(personalization.get("fanNote"), "좋아하는 마음을 한 줄로 남겨 보세요."),
			memoryImageUrl,
			Map.of(
				"fanNickname", fanNickname,
				"fanNote", asString(personalization.get("fanNote"), ""),
				"uploadedImageUrl", memoryImageUrl
			)
		));

		pages.add(new ProjectViews.Page(
			"official-closing",
			asCopyText(edition.snapshot().officialClosing(), "title", "heading", "마지막 인사"),
			asCopyText(edition.snapshot().officialClosing(), "message", "body", ""),
			firstAssetImage(edition.snapshot().curatedAssets(), edition.coverImageUrl()),
			edition.snapshot().officialClosing()
		));

		return new ProjectViews.Preview(
			project.id(),
			project.status(),
			mode,
			edition,
			personalization,
			pages
		);
	}

	private long computeDaysTogether(String subscribedSince) {
		Instant instant = parseFlexibleInstant(subscribedSince);
		return Math.max(0, ChronoUnit.DAYS.between(
			LocalDate.ofInstant(instant, ZoneOffset.UTC),
			LocalDate.now(ZoneOffset.UTC)
		));
	}

	private Instant parseFlexibleInstant(String rawValue) {
		if (rawValue.length() == 10) {
			return LocalDate.parse(rawValue).atStartOfDay().toInstant(ZoneOffset.UTC);
		}
		return Instant.parse(rawValue);
	}

	private Map<String, Object> findFavoriteVideo(List<Map<String, Object>> topVideos, String favoriteVideoId) {
		return topVideos.stream()
			.filter(video -> favoriteVideoId.equals(video.get("videoId")))
			.findFirst()
			.orElseGet(() -> topVideos.isEmpty() ? Map.of() : topVideos.get(0));
	}

	private String firstAssetImage(List<EditionViews.CuratedAsset> assets, String fallback) {
		return assets.stream()
			.filter(asset -> "IMAGE".equals(asset.assetType()))
			.findFirst()
			.map(EditionViews.CuratedAsset::content)
			.orElse(fallback);
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> asMap(Object value) {
		if (value instanceof Map<?, ?> map) {
			Map<String, Object> result = new LinkedHashMap<>();
			map.forEach((key, object) -> result.put(String.valueOf(key), object));
			return result;
		}
		return new LinkedHashMap<>();
	}

	@SuppressWarnings("unchecked")
	private List<Map<String, Object>> asListOfMaps(Object value) {
		if (value instanceof List<?> list) {
			return list.stream()
				.filter(Map.class::isInstance)
				.map(item -> asMap(item))
				.toList();
		}
		return List.of();
	}

	private String asString(Object value, String fallback) {
		return value == null ? fallback : String.valueOf(value);
	}

	private String asNonBlankString(Object value, String fallback) {
		if (value instanceof String text) {
			return text.isBlank() ? fallback : text;
		}
		return value == null ? fallback : String.valueOf(value);
	}

	private long asLong(Object value, long fallback) {
		if (value instanceof Number number) {
			return number.longValue();
		}
		if (value instanceof String string && !string.isBlank()) {
			try {
				return Long.parseLong(string);
			} catch (NumberFormatException ignored) {
				return fallback;
			}
		}
		return fallback;
	}

	private String asCopyText(Map<String, Object> source, String primaryKey, String aliasKey, String fallback) {
		String primary = asString(source.get(primaryKey), "");
		if (!primary.isBlank()) {
			return primary;
		}
		String alias = asString(source.get(aliasKey), "");
		return alias.isBlank() ? fallback : alias;
	}
}
