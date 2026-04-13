package com.playpick.application;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.time.format.TextStyle;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ProjectPreviewAssembler {

	private static final int MAX_PREVIEW_PAGES = 24;
	private static final int MAX_GALLERY_IMAGES_PER_LAYOUT = 4;
	private static final int MAX_SELECTED_CURATED_IMAGES = 40;
	private static final Set<String> NOTEBOOK_ACCENT_MONTHS_SPRING = Set.of("3", "4", "5");
	private static final Set<String> NOTEBOOK_ACCENT_MONTHS_SUMMER = Set.of("6", "7", "8");
	private static final Set<String> NOTEBOOK_ACCENT_MONTHS_AUTUMN = Set.of("9", "10", "11");

	private final PublicAssetUrlResolver publicAssetUrlResolver;

	public ProjectViews.Preview assemble(ProjectViews.Snapshot project, EditionViews.Detail edition) {
		Map<String, Object> personalization = new LinkedHashMap<>(project.personalizationData());
		personalization.remove("aiCollabSelectedUrl");
		personalization.remove("aiCollabTemplateLabel");
		String mode = normalizeMode(asString(personalization.get("mode"), "demo"));
		personalization.put("mode", mode);
		String fanNickname = asNonBlankString(personalization.get("fanNickname"), "팬");
		String creatorName = edition.creator().displayName();
		Map<String, Object> channel = asMap(personalization.get("channel"));
		Map<String, Object> bookCopy = asMap(personalization.get("bookCopy"));
		List<Map<String, Object>> topVideos = asListOfMaps(personalization.get("topVideos"));
		Map<String, Object> favoriteVideo = findFavoriteVideo(topVideos, asString(personalization.get("favoriteVideoId"), ""));
		String favoriteMomentTitle = asNonBlankString(favoriteVideo.get("title"), "오래 남은 장면");

		ProjectViews.Page officialIntroPage = buildStoryPreviewPage(
			"official-intro",
			asCopyText(edition.snapshot().officialIntro(), "title", "heading", "크리에이터의 첫 장"),
			asCopyText(edition.snapshot().officialIntro(), "message", "body", ""),
			nthAssetImage(edition.snapshot().curatedAssets(), 0, edition.coverImageUrl())
		);

		String subscribedSince = asString(personalization.get("subscribedSince"), "");
		long daysTogether = asLong(personalization.get("daysTogether"), subscribedSince.isBlank() ? 0L : computeDaysTogether(subscribedSince));
		String channelTitle = asString(channel.get("title"), creatorName);
		String defaultRelationshipTitle = subscribedSince.isBlank()
			? "여기까지 와줘서 반가워요"
			: "우리의 시간이 여기까지 왔어요";
		String defaultRelationshipBody = subscribedSince.isBlank()
			? fanNickname + "님, " + channelTitle + "의 장면들 곁에 와줘서 고마워요. 오늘은 당신이 오래 붙잡아 둔 마음을 한 장씩 같이 펼쳐볼게요."
			: fanNickname + "님, " + subscribedSince.substring(0, Math.min(10, subscribedSince.length())) + "부터 이어진 " + daysTogether + "일의 마음을 여기 조용히 꺼내둘게요.";
		ProjectViews.Page relationshipPage = buildStoryPreviewPage(
			"relationship",
			asNonBlankString(bookCopy.get("relationshipTitle"), defaultRelationshipTitle),
			asNonBlankString(bookCopy.get("relationshipBody"), defaultRelationshipBody),
			nthAssetImage(edition.snapshot().curatedAssets(), 1, "")
		);

		String defaultMomentTitle = "이 장면을 고른 당신의 마음";
		String defaultMomentBody = "'" + favoriteMomentTitle + "'을 떠올린 이유를 이 페이지 한가운데에 남겨둘게요. 당신이 오래 붙잡고 있던 순간이 이 책의 표정이 됩니다.";
		ProjectViews.Page fanPickPage = buildStoryPreviewPage(
			"fan-pick",
			asNonBlankString(bookCopy.get("momentTitle"), defaultMomentTitle),
			asNonBlankString(
				bookCopy.get("momentBody"),
				defaultMomentBody
			),
			resolveImageUrl(favoriteVideo.get("thumbnailUrl"), edition.coverImageUrl())
		);

		String memoryImageUrl = resolveImageUrl(
			personalization.get("uploadedImageUrl"),
			resolveImageUrl(personalization.get("memoryImageUrl"), resolveImageUrl(channel.get("thumbnailUrl"), edition.coverImageUrl()))
		);
		String defaultFanNoteTitle = "당신이 남긴 문장은 여기 둘게요";
		String defaultFanNoteBody = asNonBlankString(
			personalization.get("fanNote"),
			fanNickname + "님이 남긴 마음을 내가 대신 조용히 적어둔 페이지처럼 읽히면 좋겠어요."
		);
		ProjectViews.Page fanNotePage = buildStoryPreviewPage(
			"fan-note",
			asNonBlankString(bookCopy.get("fanNoteTitle"), defaultFanNoteTitle),
			asNonBlankString(bookCopy.get("fanNoteBody"), defaultFanNoteBody),
			memoryImageUrl
		);

		ProjectViews.Page officialClosingPage = buildStoryPreviewPage(
			"official-closing",
			asCopyText(edition.snapshot().officialClosing(), "title", "heading", "엔딩 노트"),
			asCopyText(edition.snapshot().officialClosing(), "message", "body", ""),
			nthAssetImage(edition.snapshot().curatedAssets(), 2, "")
		);

		List<ProjectViews.Page> entryPages = buildEntryPages(
			List.of(
				officialIntroPage,
				relationshipPage,
				fanPickPage,
				fanNotePage,
				officialClosingPage
			),
			edition.snapshot().curatedAssets(),
			edition.coverImageUrl()
		);
		List<ProjectViews.Page> pages = composeMixedPreviewPages(
			edition,
			fanNickname,
			personalization,
			entryPages
		);

		return new ProjectViews.Preview(
			project.id(),
			project.status(),
			mode,
			edition,
			null,
			personalization,
			project.sweetbookBookUid(),
			project.sweetbookExternalRef(),
			project.sweetbookDraftCreatedAt(),
			project.sweetbookFinalizedAt(),
			pages
		);
	}

	private List<ProjectViews.Page> buildEntryPages(
		List<ProjectViews.Page> narrativePages,
		List<EditionViews.CuratedAsset> curatedAssets,
		String fallbackImage
	) {
		List<ProjectViews.Page> pages = new ArrayList<>();

		List<String> curatedImageUrls = collectCuratedImageUrls(curatedAssets);
		int reservedStoryImages = Math.min(3, curatedImageUrls.size());
		List<String> galleryPool = curatedImageUrls.subList(reservedStoryImages, curatedImageUrls.size());
		int contentPageCount = Math.max(1, MAX_PREVIEW_PAGES - 2);
		List<ProjectViews.Page> selectedNarrativePages = new ArrayList<>(narrativePages);

		List<List<String>> imageGroups = groupCuratedImages(
			galleryPool,
			Math.max(contentPageCount - selectedNarrativePages.size(), 1)
		);
		if (selectedNarrativePages.isEmpty() && imageGroups.isEmpty()) {
			return pages;
		}

		int groupsPerNarrative = selectedNarrativePages.isEmpty()
			? imageGroups.size()
			: Math.max(1, (int) Math.ceil(imageGroups.size() / (double) selectedNarrativePages.size()));
		int imageGroupIndex = 0;

		for (ProjectViews.Page narrativePage : selectedNarrativePages) {
			if (pages.size() >= contentPageCount) {
				break;
			}
			pages.add(narrativePage);
			for (int count = 0; count < groupsPerNarrative && imageGroupIndex < imageGroups.size() && pages.size() < contentPageCount; count++) {
				pages.add(buildGalleryPreviewPage(imageGroups.get(imageGroupIndex), imageGroupIndex, fallbackImage));
				imageGroupIndex++;
			}
		}

		while (imageGroupIndex < imageGroups.size() && pages.size() < contentPageCount) {
			pages.add(buildGalleryPreviewPage(imageGroups.get(imageGroupIndex), imageGroupIndex, fallbackImage));
			imageGroupIndex++;
		}

		return pages;
	}

	private List<ProjectViews.Page> composeMixedPreviewPages(
		EditionViews.Detail edition,
		String fanNickname,
		Map<String, Object> personalization,
		List<ProjectViews.Page> storyPages
	) {
		List<ProjectViews.Page> result = new ArrayList<>();
		LocalDate today = LocalDate.now(ZoneOffset.UTC);
		result.add(buildMixedCoverPreviewPage(edition, fanNickname, personalization, today));
		result.add(buildMixedPublishPreviewPage(edition, today));
		result.addAll(storyPages);
		while (result.size() < MAX_PREVIEW_PAGES) {
			result.add(buildMixedBlankPreviewPage(edition.title(), today.plusDays(result.size())));
		}
		return result.size() > MAX_PREVIEW_PAGES ? result.subList(0, MAX_PREVIEW_PAGES) : result;
	}

	private ProjectViews.Page buildStoryPreviewPage(
		String key,
		String title,
		String description,
		String imageUrl
	) {
		boolean textOnly = imageUrl == null || imageUrl.isBlank();
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("pageKind", textOnly ? "TEXT_STORY" : "PHOTO_STORY");
		payload.put("templateLabel", textOnly ? "일기장B 글만" : "일기장B 사진+글");
		return new ProjectViews.Page(
			key,
			title,
			description,
			imageUrl,
			Map.copyOf(payload)
		);
	}

	private ProjectViews.Page buildMixedCoverPreviewPage(
		EditionViews.Detail edition,
		String fanNickname,
		Map<String, Object> personalization,
		LocalDate today
	) {
		String subscribedSince = asString(personalization.get("subscribedSince"), "");
		return new ProjectViews.Page(
			"cover",
			edition.title(),
			edition.subtitle(),
			edition.coverImageUrl(),
			Map.of(
				"previewTemplate", "MIXED_COVER",
				"title", edition.title(),
				"subtitle", edition.subtitle(),
				"periodText", formatMixedPeriodText(subscribedSince, today),
				"spineTitle", fanNickname + " Diary Book",
				"coverPhoto", edition.coverImageUrl(),
				"templateLabel", "일기장B 표지"
			)
		);
	}

	private ProjectViews.Page buildMixedPublishPreviewPage(EditionViews.Detail edition, LocalDate today) {
		return new ProjectViews.Page(
			"publish",
			"발행면",
			edition.creator().displayName(),
			"",
			Map.of(
				"previewTemplate", "MIXED_PUBLISH",
				"title", edition.title(),
				"publishDate", today.getYear() + "." + String.format("%02d", today.getMonthValue()) + "." + String.format("%02d", today.getDayOfMonth()),
				"author", edition.creator().displayName(),
				"publisher", "(주)스위트북 x PlayPick",
				"hashtags", "#PlayPick #Sweetbook #CreatorArchive",
				"templateLabel", "일기장B 발행면"
			)
		);
	}

	private ProjectViews.Page buildMixedBlankPreviewPage(String bookTitle, LocalDate pageDate) {
		return new ProjectViews.Page(
			"blank-" + pageDate,
			"빈내지",
			bookTitle,
			"",
			Map.of(
				"previewTemplate", "MIXED_BLANK",
				"bookTitle", bookTitle,
				"year", pageDate.getYear(),
				"month", pageDate.getMonthValue(),
				"templateLabel", "공용 빈내지"
			)
		);
	}

	private String formatMixedPeriodText(String subscribedSince, LocalDate today) {
		if (subscribedSince != null && subscribedSince.length() >= 10) {
			return subscribedSince.substring(0, 10).replace("-", ".") + " - " + today.toString().replace("-", ".");
		}
		return today.getYear() + "." + String.format("%02d", today.getMonthValue()) + "." + String.format("%02d", today.getDayOfMonth());
	}

	private List<ProjectViews.Page> applyNotebookPreviewPayload(
		List<ProjectViews.Page> pages,
		String bookTitle,
		String creatorName,
		String fanNickname
	) {
		if (pages.isEmpty()) {
			return pages;
		}

		List<ProjectViews.Page> result = new ArrayList<>();
		for (int index = 0; index < pages.size(); index++) {
			ProjectViews.Page page = pages.get(index);
			if ("cover".equals(page.key())) {
				result.add(page);
				continue;
			}

			LocalDate pageDate = LocalDate.now(ZoneOffset.UTC).plusDays(index - 1L);
			List<String> photos = resolveNotebookPhotos(page);
			Map<String, Object> payload = new LinkedHashMap<>(page.payload());
			payload.put("previewTemplate", "NOTEBOOK_C");
			payload.put("entryTitle", page.title());
			payload.put("entryDescription", page.description());
			payload.put("entryImageUrl", page.imageUrl());
			payload.put("bookTitle", bookTitle);
			payload.put("creatorName", creatorName);
			payload.put("fanNickname", fanNickname);
			payload.put("year", pageDate.getYear());
			payload.put("month", pageDate.getMonthValue());
			payload.put("monthLabel", pageDate.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase(Locale.ENGLISH));
			payload.put("dateLabel", String.format("%02d", pageDate.getDayOfMonth()));
			payload.put("weekdayLabel", pageDate.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase(Locale.ENGLISH));
			payload.put("pointColor", resolveNotebookPointColor(pageDate.getMonthValue()));
			payload.put("showMonthHeading", (index - 1) % 4 == 0);
			payload.put("photos", photos);
			payload.put("parentComment", buildNotebookComment(page, fanNickname, true));
			payload.put("teacherComment", buildNotebookComment(page, creatorName, false));
			payload.put("weatherEmoji", resolveWeatherEmoji(index - 1));

			result.add(new ProjectViews.Page(
				page.key(),
				page.title(),
				page.description(),
				page.imageUrl(),
				Map.copyOf(payload)
			));
		}
		return result;
	}

	private List<ProjectViews.Page> packNotebookPages(List<ProjectViews.Page> entryPages) {
		List<ProjectViews.Page> result = new ArrayList<>();
		for (int index = 0; index < entryPages.size(); index += 2) {
			List<Map<String, Object>> entries = new ArrayList<>();
			ProjectViews.Page first = entryPages.get(index);
			entries.add(first.payload());
			String imageUrl = first.imageUrl();
			if (index + 1 < entryPages.size()) {
				ProjectViews.Page second = entryPages.get(index + 1);
				entries.add(second.payload());
				if (imageUrl == null || imageUrl.isBlank()) {
					imageUrl = second.imageUrl();
				}
			}
			result.add(new ProjectViews.Page(
				"notebook-page-" + (result.size() + 1),
				first.title(),
				first.description(),
				imageUrl,
				Map.of(
					"previewTemplate", "NOTEBOOK_C_PAGE",
					"entries", List.copyOf(entries)
				)
			));
		}
		return result;
	}

	private ProjectViews.Page buildCoverPreviewPage(
		EditionViews.Detail edition,
		String fanNickname,
		Map<String, Object> personalization,
		LocalDate today
	) {
		String subscribedSince = asString(personalization.get("subscribedSince"), "");
		String periodText = subscribedSince.length() >= 10
			? subscribedSince.substring(0, 4) + "년 " + subscribedSince.substring(5, 7) + "월 - " + today.getYear() + "년 " + today.getMonthValue() + "월"
			: today.getYear() + "년 " + today.getMonthValue() + "월";
		return new ProjectViews.Page(
			"cover",
			edition.title(),
			edition.subtitle(),
			edition.coverImageUrl(),
			Map.of(
				"previewTemplate", "NOTEBOOK_COVER",
				"childName", fanNickname,
				"schoolName", edition.creator().displayName() + " 아카이브",
				"volumeLabel", "#1",
				"periodText", periodText,
				"coverPhoto", edition.coverImageUrl()
			)
		);
	}

	private ProjectViews.Page buildPublishPreviewPage(EditionViews.Detail edition, LocalDate today) {
		return new ProjectViews.Page(
			"publish",
			"발행면",
			edition.creator().displayName(),
			edition.coverImageUrl(),
			Map.of(
				"previewTemplate", "NOTEBOOK_PUBLISH",
				"photo", edition.coverImageUrl(),
				"title", edition.title(),
				"publishDate", today.getYear() + "년 " + today.getMonthValue() + "월 " + today.getDayOfMonth() + "일",
				"author", edition.creator().displayName(),
				"publisher", "(주)스위트북 x PlayPick",
				"hashtags", "#PlayPick #Sweetbook #CreatorArchive"
			)
		);
	}

	private ProjectViews.Page buildDividerPreviewPage(String bookTitle, LocalDate today, int chapterNum) {
		return new ProjectViews.Page(
			"divider-" + chapterNum,
			today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase(Locale.ENGLISH),
			bookTitle,
			"",
			Map.of(
				"previewTemplate", "NOTEBOOK_DIVIDER",
				"year", today.getYear(),
				"monthName", today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH).toUpperCase(Locale.ENGLISH),
				"monthNum", String.format("%02d", today.getMonthValue()),
				"chapterNum", chapterNum,
				"bgColor", resolveNotebookPointColor(today.getMonthValue())
			)
		);
	}

	private ProjectViews.Page buildBlankPreviewPage(String bookTitle, LocalDate pageDate) {
		return new ProjectViews.Page(
			"blank-" + pageDate,
			"빈내지",
			bookTitle,
			"",
			Map.of(
				"previewTemplate", "NOTEBOOK_BLANK",
				"bookTitle", bookTitle,
				"year", pageDate.getYear(),
				"month", pageDate.getMonthValue()
			)
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

	private int requiredGalleryPageCount(int imageCount) {
		if (imageCount <= 0) {
			return 0;
		}
		return (int) Math.ceil(imageCount / (double) MAX_GALLERY_IMAGES_PER_LAYOUT);
	}

	private List<List<String>> groupCuratedImages(List<String> imageUrls, int targetGroupCount) {
		if (imageUrls.isEmpty()) {
			return List.of();
		}

		int minimumRequiredGroupCount = requiredGalleryPageCount(imageUrls.size());
		int safeGroupCount = Math.max(
			1,
			Math.min(
				imageUrls.size(),
				Math.max(minimumRequiredGroupCount, targetGroupCount <= 0 ? minimumRequiredGroupCount : Math.min(targetGroupCount, imageUrls.size()))
			)
		);
		int baseGroupSize = imageUrls.size() / safeGroupCount;
		int remainder = imageUrls.size() % safeGroupCount;
		List<List<String>> groups = new ArrayList<>();
		int cursor = 0;
		for (int index = 0; index < safeGroupCount; index++) {
			int groupSize = baseGroupSize + (index < remainder ? 1 : 0);
			int nextCursor = Math.min(cursor + groupSize, imageUrls.size());
			groups.add(imageUrls.subList(cursor, nextCursor));
			cursor = nextCursor;
		}
		return groups;
	}

	private List<String> collectCuratedImageUrls(List<EditionViews.CuratedAsset> assets) {
		if (assets == null || assets.isEmpty()) {
			return List.of();
		}
		List<String> imageUrls = assets.stream()
			.filter(asset -> "IMAGE".equals(asset.assetType()))
			.map(EditionViews.CuratedAsset::content)
			.map(publicAssetUrlResolver::resolve)
			.toList();
		return selectRepresentativeImages(imageUrls, MAX_SELECTED_CURATED_IMAGES);
	}

	private List<String> selectRepresentativeImages(List<String> imageUrls, int limit) {
		if (imageUrls.size() <= limit) {
			return imageUrls;
		}

		List<String> selected = new ArrayList<>(limit);
		double maxIndex = imageUrls.size() - 1;
		for (int index = 0; index < limit; index++) {
			int sampledIndex = (int) Math.round(index * maxIndex / (limit - 1));
			String candidate = imageUrls.get(sampledIndex);
			if (!selected.contains(candidate)) {
				selected.add(candidate);
			}
		}

		if (selected.size() < limit) {
			for (String imageUrl : imageUrls) {
				if (selected.contains(imageUrl)) {
					continue;
				}
				selected.add(imageUrl);
				if (selected.size() == limit) {
					break;
				}
			}
		}
		return List.copyOf(selected);
	}

	private ProjectViews.Page buildGalleryPreviewPage(List<String> imageUrls, int index, String fallbackImage) {
		String imageUrl = imageUrls.isEmpty() ? publicAssetUrlResolver.resolve(fallbackImage) : imageUrls.get(0);
		String chapterTitle = switch (index % 3) {
			case 0 -> "공식 컷 아카이브";
			case 1 -> "무드 컷 셀렉션";
			default -> "포토북 갤러리";
		};
		String description = imageUrls.size()
			+ "개의 장면을 한 번에 담아 템포를 바꿔주는 갤러리 페이지입니다.";
		return new ProjectViews.Page(
			"gallery-" + (index + 1),
			chapterTitle,
			description,
			imageUrl,
			Map.of(
				"pageKind", "GALLERY",
				"templateLabel", "일기장B 갤러리",
				"assetType", "IMAGE_GROUP",
				"imageCount", imageUrls.size(),
				"imageUrls", List.copyOf(imageUrls)
			)
		);
	}

	private List<ProjectViews.Page> buildCuratedAssetPages(
		List<EditionViews.CuratedAsset> assets,
		String fallbackImage,
		String creatorName,
		String fanNickname
	) {
		if (assets == null || assets.isEmpty()) {
			return List.of();
		}

		List<String> imagePool = assets.stream()
			.filter(asset -> "IMAGE".equals(asset.assetType()))
			.map(EditionViews.CuratedAsset::content)
			.map(publicAssetUrlResolver::resolve)
			.toList();
		List<ProjectViews.Page> pages = new ArrayList<>();
		for (int index = 0; index < assets.size(); index++) {
			EditionViews.CuratedAsset asset = assets.get(index);
			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("assetType", asset.assetType());
			payload.put("title", asset.title());
			payload.put("content", asset.content());
			pages.add(new ProjectViews.Page(
				"curated-" + asset.assetType().toLowerCase() + "-" + (index + 1),
				asset.title(),
				describeCuratedAsset(asset, creatorName, fanNickname),
				resolveCuratedAssetImage(asset, imagePool, fallbackImage, index),
				payload
			));
		}
		return pages;
	}

	private String resolveCuratedAssetImage(
		EditionViews.CuratedAsset asset,
		List<String> imagePool,
		String fallbackImage,
		int index
	) {
		if ("IMAGE".equals(asset.assetType())) {
			return publicAssetUrlResolver.resolve(asset.content());
		}
		if (!imagePool.isEmpty()) {
			return imagePool.get(index % imagePool.size());
		}
		return publicAssetUrlResolver.resolve(fallbackImage);
	}

	private String describeCuratedAsset(EditionViews.CuratedAsset asset, String creatorName, String fanNickname) {
		return switch (asset.assetType()) {
			case "MESSAGE" -> asNonBlankString(asset.content(), creatorName + "가 이번 협업 에디션을 위해 남긴 메모입니다.");
			default -> creatorName + "가 이 에디션의 결을 만들기 위해 직접 고른 공식 장면이에요. " + fanNickname + "님의 문장과 나란히 놓였을 때 한 권의 포토북으로 읽히도록 배치했어요.";
		};
	}

	private List<String> resolveNotebookPhotos(ProjectViews.Page page) {
		if (page.payload() != null) {
			Object photoValue = page.payload().get("imageUrls");
			if (photoValue instanceof List<?> list) {
				return list.stream()
					.filter(String.class::isInstance)
					.map(String.class::cast)
					.filter(url -> !url.isBlank())
					.limit(MAX_GALLERY_IMAGES_PER_LAYOUT)
					.toList();
			}
		}
		if (page.imageUrl() == null || page.imageUrl().isBlank()) {
			return List.of();
		}
		return List.of(page.imageUrl());
	}

	private String buildNotebookComment(ProjectViews.Page page, String speaker, boolean parentTone) {
		String body = asNonBlankString(page.description(), page.title());
		String prefix = parentTone ? speaker + "님이 남긴 한마디" : speaker + "가 정리한 오늘의 기록";
		String comment = prefix + "\n" + body;
		return comment.length() > 320 ? comment.substring(0, 320) : comment;
	}

	private String resolveNotebookPointColor(int month) {
		String key = String.valueOf(month);
		if (NOTEBOOK_ACCENT_MONTHS_SPRING.contains(key)) {
			return "#F9B96E";
		}
		if (NOTEBOOK_ACCENT_MONTHS_SUMMER.contains(key)) {
			return "#8FE3CF";
		}
		if (NOTEBOOK_ACCENT_MONTHS_AUTUMN.contains(key)) {
			return "#FFB26B";
		}
		return "#8CB9FF";
	}

	private String resolveWeatherEmoji(int index) {
		return switch (Math.floorMod(index, 4)) {
			case 0 -> "☀";
			case 1 -> "☁";
			case 2 -> "☂";
			default -> "❄";
		};
	}

	private String firstAssetImage(List<EditionViews.CuratedAsset> assets, String fallback) {
		return assets.stream()
			.filter(asset -> "IMAGE".equals(asset.assetType()))
			.findFirst()
			.map(EditionViews.CuratedAsset::content)
			.map(publicAssetUrlResolver::resolve)
			.orElse(publicAssetUrlResolver.resolve(fallback));
	}

	private String nthAssetImage(List<EditionViews.CuratedAsset> assets, int index, String fallback) {
		if (assets == null || assets.isEmpty()) {
			return publicAssetUrlResolver.resolve(fallback);
		}
		List<String> imageUrls = selectRepresentativeImages(
			assets.stream()
			.filter(asset -> "IMAGE".equals(asset.assetType()))
			.map(EditionViews.CuratedAsset::content)
			.map(publicAssetUrlResolver::resolve)
			.toList(),
			MAX_SELECTED_CURATED_IMAGES
		);
		if (index >= 0 && index < imageUrls.size()) {
			return imageUrls.get(index);
		}
		return publicAssetUrlResolver.resolve(fallback);
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

	private String asCopyText(Map<String, Object> source, String primaryKey, String aliasKey, String fallback) {
		String primary = asString(source.get(primaryKey), "");
		if (!primary.isBlank()) {
			return primary;
		}
		String alias = asString(source.get(aliasKey), "");
		return alias.isBlank() ? fallback : alias;
	}
}
