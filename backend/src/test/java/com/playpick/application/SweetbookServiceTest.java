package com.playpick.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.playpick.config.AppProperties;
import com.playpick.config.SweetbookProperties;
import com.playpick.infrastructure.sweetbook.SweetbookClient;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SweetbookServiceTest {

	@Test
	void rejectsLocalAssetUrlsBeforeCallingSweetbook() {
		SweetbookClient sweetbookClient = mock(SweetbookClient.class);
		PublicAssetPublishingService publicAssetPublishingService = mock(PublicAssetPublishingService.class);
		SweetbookProperties sweetbookProperties = liveSweetbookProperties();
		AppProperties appProperties = new AppProperties();
		appProperties.setFrontendBaseUrl("http://localhost:3000");

		when(sweetbookClient.getBookSpecs()).thenReturn(List.of(new SweetbookViews.BookSpec("SQUAREBOOK_HC", "Square", 24, 130, 2)));
		when(sweetbookClient.getTemplates("SQUAREBOOK_HC")).thenReturn(defaultTemplates());

		when(publicAssetPublishingService.isConfigured()).thenReturn(false);

		SweetbookService service = new SweetbookService(
			sweetbookClient,
			sweetbookProperties,
			appProperties,
			publicAssetPublishingService
		);

		assertThatThrownBy(() -> service.prepareBookDraft(previewWithImages("/api/assets/cover.jpg", "/api/assets/page-1.jpg"), "ext", "idem", false))
			.isInstanceOf(AppException.class)
			.hasMessageContaining("커버 이미지")
			.hasMessageContaining("공개 URL");

		verify(sweetbookClient, never()).createBook(anyMap(), anyString());
	}

	@Test
	void resolvesRelativeAssetUrlsAgainstPublicFrontendBaseUrl() {
		SweetbookClient sweetbookClient = mock(SweetbookClient.class);
		PublicAssetPublishingService publicAssetPublishingService = mock(PublicAssetPublishingService.class);
		SweetbookProperties sweetbookProperties = liveSweetbookProperties();
		AppProperties appProperties = new AppProperties();
		appProperties.setFrontendBaseUrl("https://playpick.example.com");

		when(sweetbookClient.getBookSpecs()).thenReturn(List.of(new SweetbookViews.BookSpec("SQUAREBOOK_HC", "Square", 24, 130, 2)));
		when(sweetbookClient.getTemplates("SQUAREBOOK_HC")).thenReturn(defaultTemplates());
		when(sweetbookClient.createBook(anyMap(), anyString())).thenReturn("bk_test");

		when(publicAssetPublishingService.isConfigured()).thenReturn(false);

		SweetbookService service = new SweetbookService(
			sweetbookClient,
			sweetbookProperties,
			appProperties,
			publicAssetPublishingService
		);

		service.prepareBookDraft(previewWithImages("/api/assets/cover.jpg", "/demo-assets/page-1.jpg"), "ext", "idem", false);

		verify(sweetbookClient).addCover(
			eq("bk_test"),
			eq("4MY2fokVjkeY"),
			argThat(params ->
				"https://playpick.example.com/api/assets/cover.jpg".equals(params.get("frontPhoto"))
					&& "https://playpick.example.com/demo-assets/page-1.jpg".equals(params.get("backPhoto"))
			)
		);
		verify(sweetbookClient, atLeastOnce()).addContents(
			eq("bk_test"),
			eq("3FhSEhJ94c0T"),
			argThat(params -> "https://playpick.example.com/demo-assets/page-1.jpg".equals(params.get("photo1"))),
			eq("page")
		);
	}

	@Test
	void publishesDataImageUrlsWhenPublicPublishingIsConfigured() {
		SweetbookClient sweetbookClient = mock(SweetbookClient.class);
		PublicAssetPublishingService publicAssetPublishingService = mock(PublicAssetPublishingService.class);
		SweetbookProperties sweetbookProperties = liveSweetbookProperties();
		AppProperties appProperties = new AppProperties();
		appProperties.setPublicBaseUrl("https://playpick.example.com");

		when(sweetbookClient.getBookSpecs()).thenReturn(List.of(new SweetbookViews.BookSpec("SQUAREBOOK_HC", "Square", 24, 130, 2)));
		when(sweetbookClient.getTemplates("SQUAREBOOK_HC")).thenReturn(defaultTemplates());
		when(sweetbookClient.createBook(anyMap(), anyString())).thenReturn("bk_test");
		when(publicAssetPublishingService.isConfigured()).thenReturn(true);
		when(publicAssetPublishingService.publishDataUrl(anyString())).thenReturn("https://gscheon.com/playpick-assets/generated.jpg");

		SweetbookService service = new SweetbookService(
			sweetbookClient,
			sweetbookProperties,
			appProperties,
			publicAssetPublishingService
		);

		service.prepareBookDraft(
			previewWithImages("https://playpick.example.com/demo-assets/cover.jpg", "data:image/jpeg;base64,ZmFrZQ=="),
			"ext",
			"idem",
			false
		);

		verify(publicAssetPublishingService, atLeastOnce()).publishDataUrl("data:image/jpeg;base64,ZmFrZQ==");
		verify(sweetbookClient, atLeastOnce()).addContents(
			eq("bk_test"),
			eq("3FhSEhJ94c0T"),
			argThat(params -> "https://gscheon.com/playpick-assets/generated.jpg".equals(params.get("photo1"))),
			eq("page")
		);
	}

	private SweetbookProperties liveSweetbookProperties() {
		SweetbookProperties properties = new SweetbookProperties();
		properties.setEnabled(true);
		properties.setApiKey("test-key");
		properties.setBaseUrl("https://api-sandbox.sweetbook.com/v1");
		properties.setDefaultCoverTemplateUid("4MY2fokVjkeY");
		properties.setDefaultPublishTemplateUid("75vMl9IeyPMI");
		properties.setDefaultContentTemplateUid("3FhSEhJ94c0T");
		properties.setDefaultContentTextTemplateUid("vHA59XPPKqak");
		properties.setDefaultContentGalleryTemplateUid("y5Ih0Uo7tuQ3");
		properties.setDefaultDividerTemplateUid("1N8i0MR6Ro1D");
		return properties;
	}

	private List<SweetbookViews.Template> defaultTemplates() {
		return List.of(
			new SweetbookViews.Template("4MY2fokVjkeY", "표지", "album", "cover", ""),
			new SweetbookViews.Template("75vMl9IeyPMI", "발행면", "album", "publish", ""),
			new SweetbookViews.Template("3FhSEhJ94c0T", "내지a_contain", "album", "content", ""),
			new SweetbookViews.Template("vHA59XPPKqak", "내지b", "album", "content", ""),
			new SweetbookViews.Template("y5Ih0Uo7tuQ3", "내지_gallery", "album", "content", ""),
			new SweetbookViews.Template("1N8i0MR6Ro1D", "간지", "album", "divider", "")
		);
	}

	private ProjectViews.Preview previewWithImages(String coverImageUrl, String contentImageUrl) {
		EditionViews.Detail edition = new EditionViews.Detail(
			1L,
			"메모리북",
			"샘플",
			coverImageUrl,
			"PUBLISHED",
			new EditionViews.Creator(1L, "온도로그", "@ondolog", "https://picsum.photos/seed/avatar/240/240", true),
			new EditionViews.Snapshot(
				10L,
				1,
				"SQUAREBOOK_HC",
				"4MY2fokVjkeY",
				"75vMl9IeyPMI",
				"3FhSEhJ94c0T",
				Map.of("title", "인트로", "message", "안녕하세요"),
				Map.of("title", "아웃트로", "message", "고마워요"),
				Instant.parse("2026-04-08T00:00:00Z"),
				List.of(),
				List.of()
			),
			Instant.parse("2026-04-01T00:00:00Z"),
			Instant.parse("2026-04-08T00:00:00Z")
		);

		return new ProjectViews.Preview(
			99L,
			"PERSONALIZED",
			"demo",
			edition,
			Map.of("fanNickname", "팬"),
			null,
			null,
			null,
			null,
			List.of(
				new ProjectViews.Page("cover", "표지", "설명", coverImageUrl, Map.of()),
				new ProjectViews.Page("official-intro", "인트로", "설명", contentImageUrl, Map.of()),
				new ProjectViews.Page("relationship", "관계", "설명", contentImageUrl, Map.of()),
				new ProjectViews.Page("top-videos", "영상", "설명", contentImageUrl, Map.of()),
				new ProjectViews.Page("fan-pick", "픽", "설명", contentImageUrl, Map.of()),
				new ProjectViews.Page("fan-note", "팬노트", "설명", contentImageUrl, Map.of()),
				new ProjectViews.Page("official-closing", "클로징", "설명", contentImageUrl, Map.of())
			)
		);
	}
}
