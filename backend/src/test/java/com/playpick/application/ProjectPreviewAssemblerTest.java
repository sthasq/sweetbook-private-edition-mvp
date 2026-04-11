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
			"기념 드롭",
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

		assertThat(preview.pages()).hasSize(7);
		assertThat(preview.pages().get(0).description()).contains("경신님을 위한 한 권");
		assertThat(preview.pages().get(2).description()).contains("1332일");
		assertThat(preview.pages().get(5).title()).isEqualTo("경신님의 한마디");
	}

	@Test
	void usesPaniCollabCutWhenSelectedImageExists() {
		EditionViews.Detail edition = new EditionViews.Detail(
			1L,
			"빠니보틀 세계여행 메모리북 데모",
			"여행 메모리 드롭",
			"/demo-assets/panibottle-cover.jpg",
			"PUBLISHED",
			new EditionViews.Creator(1L, "빠니보틀", "@PaniBottle", "/demo-assets/panibottle-avatar.jpg", true),
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
				"fanNote", "같이 여행 다녀온 듯한 컷이 마음에 들어요.",
				"aiCollabSelectedUrl", "data:image/jpeg;base64,collab-demo",
				"aiCollabTemplateLabel", "여행 동행 셀카"
			),
			null,
			null,
			null,
			null,
			Instant.parse("2026-04-07T00:00:00Z"),
			Instant.parse("2026-04-08T00:00:00Z")
		);

		ProjectViews.Preview preview = assembler.assemble(project, edition);

		assertThat(preview.pages().get(5).title()).isEqualTo("빠니보틀과 남긴 여행 동행 셀카");
		assertThat(preview.pages().get(5).imageUrl()).isEqualTo("data:image/jpeg;base64,collab-demo");
		assertThat(preview.pages().get(5).description()).contains("같이 여행 다녀온 듯한 컷");
	}

	@Test
	void resolvesRelativeImageUrlsAgainstFrontendBaseUrl() {
		EditionViews.Detail edition = new EditionViews.Detail(
			1L,
			"상대경로 에디션",
			"샘플",
			"https://playpick.example.com/demo-assets/cover.jpg",
			"PUBLISHED",
			new EditionViews.Creator(1L, "빠니보틀", "@PaniBottle", "https://playpick.example.com/demo-assets/avatar.jpg", true),
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
					"title", "빠니보틀",
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

		assertThat(preview.pages().get(1).imageUrl()).isEqualTo("https://playpick.example.com/demo-assets/intro.jpg");
		assertThat(preview.pages().get(2).imageUrl()).isEqualTo("https://playpick.example.com/demo-assets/banner.jpg");
		assertThat(preview.pages().get(3).imageUrl()).isEqualTo("https://playpick.example.com/demo-assets/video.jpg");
		assertThat(preview.pages().get(5).imageUrl()).isEqualTo("https://playpick.example.com/api/assets/memory.jpg");
	}

	private static PublicAssetUrlResolver publicAssetUrlResolver() {
		AppProperties appProperties = new AppProperties();
		appProperties.setFrontendBaseUrl("https://playpick.example.com");
		return new PublicAssetUrlResolver(appProperties);
	}
}
