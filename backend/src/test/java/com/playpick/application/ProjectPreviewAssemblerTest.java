package com.playpick.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ProjectPreviewAssemblerTest {

	private final ProjectPreviewAssembler assembler = new ProjectPreviewAssembler();

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
			Instant.parse("2026-04-07T00:00:00Z"),
			Instant.parse("2026-04-08T00:00:00Z")
		);

		ProjectViews.Preview preview = assembler.assemble(project, edition);

		assertThat(preview.pages()).hasSize(7);
		assertThat(preview.pages().get(0).description()).contains("경신님을 위한 한 권");
		assertThat(preview.pages().get(2).description()).contains("1332일");
		assertThat(preview.pages().get(5).title()).isEqualTo("경신님의 한마디");
	}
}
