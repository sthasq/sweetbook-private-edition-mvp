package com.playpick.application;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ProjectPreviewAssembler {

	private final PublicAssetUrlResolver publicAssetUrlResolver;

	public ProjectViews.Preview assemble(ProjectViews.Snapshot project, EditionViews.Detail edition) {
		Map<String, Object> personalization = new LinkedHashMap<>(project.personalizationData());
		String mode = normalizeMode(asString(personalization.get("mode"), "demo"));
		personalization.put("mode", mode);
		String fanNickname = asNonBlankString(personalization.get("fanNickname"), "팬");
		String creatorName = edition.creator().displayName();
		Map<String, Object> channel = asMap(personalization.get("channel"));
		Map<String, Object> bookCopy = asMap(personalization.get("bookCopy"));
		List<Map<String, Object>> topVideos = asListOfMaps(personalization.get("topVideos"));
		Map<String, Object> favoriteVideo = findFavoriteVideo(topVideos, asString(personalization.get("favoriteVideoId"), ""));
		String favoriteMomentTitle = asNonBlankString(favoriteVideo.get("title"), "오래 남은 장면");

		List<ProjectViews.Page> pages = new ArrayList<>();
		pages.add(new ProjectViews.Page(
			"cover",
			edition.title(),
			creatorName + "가 " + fanNickname + "님에게 건네는 한 권",
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
		String channelTitle = asString(channel.get("title"), creatorName);
		String defaultRelationshipTitle = subscribedSince.isBlank()
			? "여기까지 와줘서 반가워요"
			: "우리의 시간이 여기까지 왔어요";
		String defaultRelationshipBody = subscribedSince.isBlank()
			? fanNickname + "님, " + channelTitle + "의 장면들 곁에 와줘서 고마워요. 오늘은 당신이 오래 붙잡아 둔 마음을 한 장씩 같이 펼쳐볼게요."
			: fanNickname + "님, " + subscribedSince.substring(0, Math.min(10, subscribedSince.length())) + "부터 이어진 " + daysTogether + "일의 마음을 여기 조용히 꺼내둘게요.";
		pages.add(new ProjectViews.Page(
			"relationship",
			asNonBlankString(bookCopy.get("relationshipTitle"), defaultRelationshipTitle),
			asNonBlankString(bookCopy.get("relationshipBody"), defaultRelationshipBody),
			resolveImageUrl(channel.get("bannerUrl"), edition.coverImageUrl()),
			Map.of(
				"daysTogether", daysTogether,
				"subscribedSince", subscribedSince,
				"channel", channel
			)
		));

		String defaultMomentList = topVideos.stream()
			.limit(5)
			.map(video -> asNonBlankString(video.get("title"), "제목 없는 영상"))
			.reduce((left, right) -> left + " · " + right)
			.orElse("내가 먼저 꺼내 보여주고 싶은 장면들을 여기 채워둘게요.");
		pages.add(new ProjectViews.Page(
			"top-videos",
			"이 장면부터 같이 볼까요",
			defaultMomentList,
			topVideos.isEmpty() ? edition.coverImageUrl() : resolveImageUrl(topVideos.get(0).get("thumbnailUrl"), edition.coverImageUrl()),
			Map.of("topVideos", topVideos)
		));

		String defaultMomentTitle = "이 장면을 고른 당신의 마음";
		String defaultMomentBody = "'" + favoriteMomentTitle + "'을 떠올린 이유를 이 페이지 한가운데에 남겨둘게요. 당신이 오래 붙잡고 있던 순간이 이 책의 표정이 됩니다.";
		pages.add(new ProjectViews.Page(
			"fan-pick",
			asNonBlankString(bookCopy.get("momentTitle"), defaultMomentTitle),
			asNonBlankString(
				bookCopy.get("momentBody"),
				defaultMomentBody
			),
			resolveImageUrl(favoriteVideo.get("thumbnailUrl"), edition.coverImageUrl()),
			Map.of(
				"favoriteVideo", favoriteVideo,
				"favoriteReason", asString(personalization.get("favoriteReason"), ""),
				"fanNote", asString(personalization.get("fanNote"), "")
			)
		));

		boolean hasAiCollabCut = edition.id() == 1L && hasText(personalization.get("aiCollabSelectedUrl"));
		String aiCollabImageUrl = resolveImageUrl(personalization.get("aiCollabSelectedUrl"), "");
		String aiCollabTemplateLabel = asNonBlankString(personalization.get("aiCollabTemplateLabel"), "공식 콜라보 컷");
		String memoryImageUrl = resolveImageUrl(
			personalization.get("uploadedImageUrl"),
			resolveImageUrl(personalization.get("memoryImageUrl"), resolveImageUrl(channel.get("thumbnailUrl"), edition.coverImageUrl()))
		);
		String defaultFanNoteTitle = hasAiCollabCut
			? "이 한 컷에 당신의 마음도 같이 담아둘게요"
			: "당신이 남긴 문장은 여기 둘게요";
		String defaultFanNoteBody = hasAiCollabCut
			? asNonBlankString(personalization.get("fanNote"), aiCollabTemplateLabel + " 안에 당신이 기억한 분위기도 함께 눌러 담아둘게요.")
			: asNonBlankString(personalization.get("fanNote"), fanNickname + "님이 남긴 마음을 내가 대신 조용히 적어둔 페이지처럼 읽히면 좋겠어요.");
		pages.add(new ProjectViews.Page(
			"fan-note",
			asNonBlankString(bookCopy.get("fanNoteTitle"), defaultFanNoteTitle),
			asNonBlankString(bookCopy.get("fanNoteBody"), defaultFanNoteBody),
			hasAiCollabCut ? aiCollabImageUrl : memoryImageUrl,
			Map.of(
				"fanNickname", fanNickname,
				"fanNote", asString(personalization.get("fanNote"), ""),
				"uploadedImageUrl", hasAiCollabCut ? aiCollabImageUrl : memoryImageUrl,
				"aiCollabTemplateLabel", aiCollabTemplateLabel
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
			project.sweetbookBookUid(),
			project.sweetbookExternalRef(),
			project.sweetbookDraftCreatedAt(),
			project.sweetbookFinalizedAt(),
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
			.map(publicAssetUrlResolver::resolve)
			.orElse(publicAssetUrlResolver.resolve(fallback));
	}

	private String resolveImageUrl(Object value, String fallback) {
		String raw = asString(value, fallback);
		return publicAssetUrlResolver.resolve(raw);
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

	private String normalizeMode(String rawMode) {
		if (rawMode == null || rawMode.isBlank()) {
			return "demo";
		}
		String normalized = rawMode.trim().toLowerCase();
		if ("youtube".equals(normalized)) {
			return "demo";
		}
		return normalized;
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

	private boolean hasText(Object value) {
		if (value instanceof String text) {
			return !text.isBlank();
		}
		return value != null && !String.valueOf(value).isBlank();
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
