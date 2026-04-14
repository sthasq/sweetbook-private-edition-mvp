package com.playpick.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.playpick.config.AppProperties;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ProjectPreviewAssemblerTest {

	private final ProjectPreviewAssembler assembler = new ProjectPreviewAssembler(publicAssetUrlResolver());

	@Test
	void assemblesYoutubeRecapIntoSpreadSequence() {
		EditionViews.Detail edition = new EditionViews.Detail(
			1L,
			"2주년 기념 메모리북",
			"기념 에디션",
			"https://picsum.photos/seed/cover/1200/1200",
			"PUBLISHED",
			new EditionViews.Creator(1L, "온도로그", "@ondolog", "https://picsum.photos/seed/avatar/240/240", true),
			new EditionViews.Snapshot(
				10L,
				1,
				"SQUAREBOOK_HC",
				"demo-cover-template",
				"demo-publish-template",
				"demo-content-template",
				Map.of("title", "크리에이터 인사", "message", "함께해 줘서 고마워요."),
				Map.of("title", "마지막 인사", "message", "다음 장면도 같이 남겨요."),
				Instant.parse("2026-04-08T00:00:00Z"),
				List.of(new EditionViews.CuratedAsset(1L, "IMAGE", "Intro Visual", "https://picsum.photos/seed/intro/1200/900", 1)),
				List.of()
			),
			Instant.parse("2026-04-01T00:00:00Z"),
			Instant.parse("2026-04-08T00:00:00Z")
		);

		ProjectViews.Snapshot project = new ProjectViews.Snapshot(
			99L,
			1L,
			10L,
			"PERSONALIZED",
			Map.of(
				"mode", "youtube",
				"fanNickname", "경신",
				"subscribedSince", "2022-08-15T00:00:00Z",
				"daysTogether", 1332,
				"favoriteVideoId", "video-2",
				"fanNote", "퇴근길을 버티게 해준 영상이에요.",
				"uploadedImageUrl", "https://picsum.photos/seed/fan/1200/900",
				"channel", Map.of(
					"title", "온도로그",
					"bannerUrl", "https://picsum.photos/seed/banner/1600/500",
					"thumbnailUrl", "https://picsum.photos/seed/channel/600/600"
				),
				"topVideos", List.of(
					Map.of("videoId", "video-1", "title", "루틴 브이로그", "thumbnailUrl", "https://picsum.photos/seed/video1/1280/720", "viewCount", 520000),
					Map.of("videoId", "video-2", "title", "2주년 라이브", "thumbnailUrl", "https://picsum.photos/seed/video2/1280/720", "viewCount", 481000)
				)
			),
			null,
			null,
			null,
			null,
			Instant.parse("2026-04-07T00:00:00Z"),
			Instant.parse("2026-04-08T00:00:00Z")
		);

		ProjectViews.Preview preview = assembler.assemble(project, edition);

		assertThat(preview.pages()).hasSize(24);
		assertThat(preview.pages().get(0).payload()).containsEntry("previewTemplate", "MIXED_COVER");
		assertThat(preview.pages().get(0).payload()).containsEntry("spineTitle", "경신 Diary Book");
		assertThat(preview.pages().get(23).key()).isEqualTo("publish");
		assertThat(preview.pages().get(23).payload()).containsEntry("previewTemplate", "MIXED_PUBLISH");
		assertThat(storyPages(preview))
			.anySatisfy(page -> assertThat(page.description()).contains("1332일"))
			.anySatisfy(page -> assertThat(page.title()).isEqualTo("당신이 남긴 문장은 여기 둘게요"))
			.anySatisfy(page -> assertThat(page.imageUrl()).isNotBlank());
	}

	@Test
	void usesGeneratedBookCopyWhenPresent() {
		EditionViews.Detail edition = new EditionViews.Detail(
			1L,
			"Astra Vale 사막 횡단 메모리북 데모",
			"가상 여행 크리에이터 Astra Vale의 기록 감성으로 구성한 메모리북 데모",
			"/demo-assets/panibottle-cover.jpg",
			"PUBLISHED",
			new EditionViews.Creator(1L, "Astra Vale", "@astravale", "/demo-assets/panibottle-avatar.jpg", true),
			new EditionViews.Snapshot(
				10L,
				1,
				"SQUAREBOOK_HC",
				"demo-cover-template",
				"demo-publish-template",
				"demo-content-template",
				Map.of("title", "크리에이터 인사", "message", "같이 여행 가듯 넘겨 보세요."),
				Map.of("title", "마지막 인사", "message", "다음 장면도 같이 저장해요."),
				Instant.parse("2026-04-08T00:00:00Z"),
				List.of(new EditionViews.CuratedAsset(1L, "IMAGE", "Intro Visual", "/demo-assets/panibottle-cover.jpg", 1)),
				List.of()
			),
			Instant.parse("2026-04-01T00:00:00Z"),
			Instant.parse("2026-04-08T00:00:00Z")
		);

		ProjectViews.Snapshot project = new ProjectViews.Snapshot(
			99L,
			1L,
			10L,
			"PERSONALIZED",
			Map.of(
				"mode", "demo",
				"fanNickname", "연두",
				"subscribedSince", "2023-07-14",
				"daysTogether", 1002,
				"favoriteVideoId", "astra-demo-2",
				"fanNote", "밤기차 플랫폼 장면이 오래 남았어요.",
				"channel", Map.of(
					"title", "Astra Vale",
					"bannerUrl", "/demo-assets/banner.jpg",
					"thumbnailUrl", "/demo-assets/thumb.jpg"
				),
				"topVideos", List.of(
					Map.of("videoId", "astra-demo-2", "title", "야간열차 플랫폼의 기록", "thumbnailUrl", "/demo-assets/video.jpg", "viewCount", 100)
				),
				"bookCopy", Map.of(
					"relationshipTitle", "처음 멈춰 서서 오래 본 계절",
					"relationshipBody", "연두님이 Astra Vale의 기록을 따라 걷기 시작한 시간은 조용히 오래 남는 장면이 되었습니다.",
					"momentTitle", "플랫폼에 남은 잔상",
					"momentBody", "밤기차 플랫폼의 공기와 손끝의 긴장이 한 장면처럼 다시 펼쳐지도록 문장을 눌러 담았습니다.",
					"fanNoteTitle", "연두님이 붙잡아 둔 한 문장",
					"fanNoteBody", "스쳐 지나갈 것 같던 장면도 오래 붙잡고 싶어지는 순간이 있다는 걸, 그 밤의 플랫폼이 먼저 알려주었습니다."
				)
			),
			null,
			null,
			null,
			null,
			Instant.parse("2026-04-07T00:00:00Z"),
			Instant.parse("2026-04-08T00:00:00Z")
		);

		ProjectViews.Preview preview = assembler.assemble(project, edition);

		assertThat(storyPages(preview))
			.anySatisfy(page -> assertThat(page.title()).isEqualTo("처음 멈춰 서서 오래 본 계절"))
			.anySatisfy(page -> assertThat(page.description()).contains("연두님이 Astra Vale의 기록"))
			.anySatisfy(page -> assertThat(page.title()).isEqualTo("플랫폼에 남은 잔상"))
			.anySatisfy(page -> assertThat(page.title()).isEqualTo("연두님이 붙잡아 둔 한 문장"))
			.anySatisfy(page -> assertThat(page.description()).contains("그 밤의 플랫폼"));
	}

	@Test
	void resolvesRelativeImageUrlsAgainstFrontendBaseUrl() {
		EditionViews.Detail edition = new EditionViews.Detail(
			1L,
			"상대경로 에디션",
			"샘플",
			"https://playpick.example.com/demo-assets/cover.jpg",
			"PUBLISHED",
			new EditionViews.Creator(1L, "Astra Vale", "@astravale", "https://playpick.example.com/demo-assets/avatar.jpg", true),
			new EditionViews.Snapshot(
				10L,
				1,
				"SQUAREBOOK_HC",
				"demo-cover-template",
				"demo-publish-template",
				"demo-content-template",
				Map.of("title", "크리에이터 인사", "message", "같이 여행 가듯 넘겨 보세요."),
				Map.of("title", "마지막 인사", "message", "다음 장면도 같이 저장해요."),
				Instant.parse("2026-04-08T00:00:00Z"),
				List.of(new EditionViews.CuratedAsset(1L, "IMAGE", "Intro Visual", "/demo-assets/intro.jpg", 1)),
				List.of()
			),
			Instant.parse("2026-04-01T00:00:00Z"),
			Instant.parse("2026-04-08T00:00:00Z")
		);

		ProjectViews.Snapshot project = new ProjectViews.Snapshot(
			99L,
			1L,
			10L,
			"PERSONALIZED",
			Map.of(
				"mode", "demo",
				"fanNickname", "연두",
				"uploadedImageUrl", "/api/assets/memory.jpg",
				"channel", Map.of(
					"title", "Astra Vale",
					"bannerUrl", "/demo-assets/banner.jpg",
					"thumbnailUrl", "/demo-assets/thumb.jpg"
				),
				"topVideos", List.of(
					Map.of("videoId", "video-1", "title", "샘플 영상", "thumbnailUrl", "/demo-assets/video.jpg", "viewCount", 100)
				)
			),
			null,
			null,
			null,
			null,
			Instant.parse("2026-04-07T00:00:00Z"),
			Instant.parse("2026-04-08T00:00:00Z")
		);

		ProjectViews.Preview preview = assembler.assemble(project, edition);

		assertThat(preview.pages().get(0).imageUrl()).isEqualTo("https://playpick.example.com/demo-assets/cover.jpg");
		assertThat(storyPages(preview))
			.anySatisfy(page -> assertThat(page.imageUrl()).isEqualTo("https://playpick.example.com/demo-assets/intro.jpg"))
			.anySatisfy(page -> assertThat(page.imageUrl()).isEqualTo("https://playpick.example.com/demo-assets/video.jpg"))
			.anySatisfy(page -> assertThat(page.imageUrl()).isEqualTo("https://playpick.example.com/api/assets/memory.jpg"));
	}

	@Test
	void compressesLargeCuratedImageSetsIntoTwentyFourPagePreview() {
		List<EditionViews.CuratedAsset> curatedAssets = new java.util.ArrayList<>();
		for (int index = 1; index <= 70; index++) {
			curatedAssets.add(new EditionViews.CuratedAsset(
				(long) index,
				"IMAGE",
				"Generated Asset " + index,
				"/demo-assets/generated/asset-" + index + ".jpg",
				index
			));
		}

		EditionViews.Detail edition = new EditionViews.Detail(
			1L,
			"Collab Archive",
			"샘플",
			"https://playpick.example.com/demo-assets/cover.jpg",
			"PUBLISHED",
			new EditionViews.Creator(1L, "Astra Vale · Mina Loop · Noah Reed", "@playpick", "https://playpick.example.com/demo-assets/avatar.jpg", true),
			new EditionViews.Snapshot(
				10L,
				1,
				"SQUAREBOOK_HC",
				"demo-cover-template",
				"demo-publish-template",
				"demo-content-template",
				Map.of("title", "크리에이터 인사", "message", "같이 펼쳐봐요."),
				Map.of("title", "마지막 인사", "message", "끝까지 함께해줘서 고마워요."),
				Instant.parse("2026-04-08T00:00:00Z"),
				curatedAssets,
				List.of()
			),
			Instant.parse("2026-04-01T00:00:00Z"),
			Instant.parse("2026-04-08T00:00:00Z")
		);

		ProjectViews.Snapshot project = new ProjectViews.Snapshot(
			99L,
			1L,
			10L,
			"PERSONALIZED",
			Map.of(
				"mode", "demo",
				"fanNickname", "루나",
				"subscribedSince", "2023-07-01",
				"favoriteVideoId", "video-1",
				"fanNote", "이 순간들을 함께 나눌 수 있어 감사해요",
				"channel", Map.of(
					"title", "Collab Archive",
					"bannerUrl", "/demo-assets/banner.jpg",
					"thumbnailUrl", "/demo-assets/thumb.jpg"
				),
				"topVideos", List.of(
					Map.of("videoId", "video-1", "title", "첫 콜라보 무드", "thumbnailUrl", "/demo-assets/video.jpg", "viewCount", 100)
				)
			),
			null,
			null,
			null,
			null,
			Instant.parse("2026-04-07T00:00:00Z"),
			Instant.parse("2026-04-08T00:00:00Z")
		);

		ProjectViews.Preview preview = assembler.assemble(project, edition);

		assertThat(preview.pages()).hasSize(24);
		assertThat(preview.pages().get(23).key()).isEqualTo("publish");
		assertThat(galleryPages(preview)).isNotEmpty();
		assertThat(galleryPages(preview))
			.allSatisfy(page -> assertThat((List<?>) page.payload().get("imageUrls")).hasSizeBetween(1, 4));
		assertThat(galleryPages(preview).stream()
			.flatMap(page -> ((List<String>) page.payload().get("imageUrls")).stream())
			.distinct()
			.toList()).hasSize(37);
	}

	private static PublicAssetUrlResolver publicAssetUrlResolver() {
		AppProperties appProperties = new AppProperties();
		appProperties.setFrontendBaseUrl("https://playpick.example.com");
		return new PublicAssetUrlResolver(appProperties);
	}

	private static List<ProjectViews.Page> storyPages(ProjectViews.Preview preview) {
		return preview.pages().stream()
			.filter(page -> {
				Object payload = page.payload().get("pageKind");
				return "PHOTO_STORY".equals(payload) || "TEXT_STORY".equals(payload);
			})
			.toList();
	}

	private static List<ProjectViews.Page> galleryPages(ProjectViews.Preview preview) {
		return preview.pages().stream()
			.filter(page -> "IMAGE_GROUP".equals(page.payload().get("assetType")))
			.toList();
	}
}
