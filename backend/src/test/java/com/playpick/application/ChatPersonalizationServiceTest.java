package com.playpick.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.playpick.config.AppProperties;
import com.playpick.config.OpenRouterProperties;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ChatPersonalizationServiceTest {

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final ChatPersonalizationService service = new ChatPersonalizationService(
		new OpenRouterProperties(),
		new AppProperties(),
		null,
		objectMapper
	);

	@Test
	void includesTightBookCopyLengthGuidanceInSystemPrompt() {
		EditionViews.Detail edition = new EditionViews.Detail(
			1L,
			"Sweetbook Demo",
			"짧고 다정한 포토북",
			"/demo-assets/cover.jpg",
			"PUBLISHED",
			new EditionViews.Creator(1L, "Astra Vale", "@astravale", "/demo-assets/avatar.jpg", true),
			new EditionViews.Snapshot(
				10L,
				1,
				"SQUAREBOOK_HC",
				"cover-template",
				"publish-template",
				"content-template",
				Map.of("title", "크리에이터 인사", "message", "같이 넘겨 봐요."),
				Map.of("title", "마지막 인사", "message", "다음 장면도 남겨요."),
				Instant.parse("2026-04-08T00:00:00Z"),
				List.of(),
				List.of()
			),
			Instant.parse("2026-04-01T00:00:00Z"),
			Instant.parse("2026-04-08T00:00:00Z")
		);

		String prompt = service.buildSystemPrompt(
			edition,
			Map.of("fanNickname", "연두"),
			List.of(new EditionViews.PersonalizationField(1L, "fanNickname", "닉네임", "TEXT", true, 20, 1))
		);

		assertThat(prompt)
			.contains("proposal.bookCopy must fit the tightest photo+text print layout")
			.contains("Keep every title field (relationshipTitle, momentTitle, fanNoteTitle) under " + SweetbookTemplateCopyPolicy.PHOTO_STORY_TITLE_MAX + " Korean characters.")
			.contains("Keep every body field (relationshipBody, momentBody, fanNoteBody) to one short sentence under " + SweetbookTemplateCopyPolicy.PHOTO_STORY_BODY_MAX + " Korean characters.")
			.contains("Do not use line breaks");
	}

	@Test
	void normalizesBookCopyToSingleLineAndTightPhotoStoryLimits() {
		ObjectNode proposal = objectMapper.createObjectNode();
		ObjectNode bookCopy = proposal.putObject("bookCopy");
		bookCopy.put("relationshipTitle", "정말 길고\n줄바꿈까지 있는 제목입니다");
		bookCopy.put("relationshipBody", "첫 줄 설명입니다.\n둘째 줄 설명이 이어지고  공백도   많습니다.");
		bookCopy.put("fanNoteBody", "   인플루언서가   남긴\n긴 문장을 한 줄로 정리해야 합니다.   ");

		Map<String, Object> normalized = service.normalizeProposal(
			proposal,
			List.of(new EditionViews.PersonalizationField(1L, "fanNickname", "닉네임", "TEXT", true, 20, 1))
		);

		assertThat(normalized).containsKey("bookCopy");
		@SuppressWarnings("unchecked")
		Map<String, Object> normalizedBookCopy = (Map<String, Object>) normalized.get("bookCopy");
		assertThat(String.valueOf(normalizedBookCopy.get("relationshipTitle")))
			.hasSizeLessThanOrEqualTo(SweetbookTemplateCopyPolicy.PHOTO_STORY_TITLE_MAX)
			.doesNotContain("\n")
			.doesNotContain("\r")
			.doesNotContain("  ");
		assertThat(String.valueOf(normalizedBookCopy.get("relationshipBody")))
			.hasSizeLessThanOrEqualTo(SweetbookTemplateCopyPolicy.PHOTO_STORY_BODY_MAX)
			.doesNotContain("\n")
			.doesNotContain("\r")
			.doesNotContain("  ");
		assertThat(String.valueOf(normalizedBookCopy.get("fanNoteBody")))
			.hasSizeLessThanOrEqualTo(SweetbookTemplateCopyPolicy.PHOTO_STORY_BODY_MAX)
			.doesNotContain("\n")
			.doesNotContain("\r")
			.doesNotContain("  ");
	}
}
