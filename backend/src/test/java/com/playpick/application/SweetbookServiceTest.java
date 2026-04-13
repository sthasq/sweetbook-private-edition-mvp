package com.playpick.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.playpick.config.AppProperties;
import com.playpick.config.SweetbookProperties;
import com.playpick.infrastructure.sweetbook.SweetbookClient;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SweetbookServiceTest {

	@Test
	void fallsBackToSimulatedDraftWhenAssetsAreLocalOnly() {
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

		ProjectViews.BookGeneration generation = service.prepareBookDraft(
			previewWithImages("/api/assets/cover.jpg", "/api/assets/page-1.jpg"),
			"ext",
			"idem",
			false
		);

		assertThat(generation.simulated()).isTrue();
		assertThat(generation.bookUid()).startsWith("demo-book-");
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
					&& "팬 Diary Book".equals(params.get("spineTitle"))
			)
		);
		verify(sweetbookClient, atLeastOnce()).addContents(
			eq("bk_test"),
			eq("3FhSEhJ94c0T"),
			argThat(params -> "인트로".equals(params.get("title"))),
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
		verify(sweetbookClient).addCover(
			eq("bk_test"),
			eq("4MY2fokVjkeY"),
			argThat(params -> "https://playpick.example.com/demo-assets/cover.jpg".equals(params.get("frontPhoto")))
		);
	}

	@Test
	void publishesRelativeDemoAssetsWhenPublicPublishingIsConfigured() throws Exception {
		SweetbookClient sweetbookClient = mock(SweetbookClient.class);
		PublicAssetPublishingService publicAssetPublishingService = mock(PublicAssetPublishingService.class);
		SweetbookProperties sweetbookProperties = liveSweetbookProperties();
		AppProperties appProperties = new AppProperties();
		Path demoAssetDir = Files.createTempDirectory("playpick-demo-assets");
		Files.writeString(demoAssetDir.resolve("cover.jpg"), "cover");
		Files.writeString(demoAssetDir.resolve("page-1.jpg"), "page");
		appProperties.setDemoAssetDir(demoAssetDir.toString());
		appProperties.setFrontendBaseUrl("http://localhost:3000");

		when(sweetbookClient.getBookSpecs()).thenReturn(List.of(new SweetbookViews.BookSpec("SQUAREBOOK_HC", "Square", 24, 130, 2)));
		when(sweetbookClient.getTemplates("SQUAREBOOK_HC")).thenReturn(defaultTemplates());
		when(sweetbookClient.createBook(anyMap(), anyString())).thenReturn("bk_test");
		when(publicAssetPublishingService.isConfigured()).thenReturn(true);
		when(publicAssetPublishingService.publishFile(any(Path.class), anyString()))
			.thenReturn("https://gscheon.com/playpick-assets/published-cover.jpg");

		SweetbookService service = new SweetbookService(
			sweetbookClient,
			sweetbookProperties,
			appProperties,
			publicAssetPublishingService
		);

		service.prepareBookDraft(
			previewWithImages("/demo-assets/cover.jpg", "/demo-assets/page-1.jpg"),
			"ext",
			"idem",
			false
		);

		verify(publicAssetPublishingService, atLeastOnce()).publishFile(any(Path.class), anyString());
		verify(sweetbookClient).addCover(
			eq("bk_test"),
			eq("4MY2fokVjkeY"),
			argThat(params ->
				String.valueOf(params.get("frontPhoto")).startsWith("https://gscheon.com/playpick-assets/")
			)
		);
	}

	@Test
	void reusesPublishedLocalAssetsWithinSingleDraftGeneration() throws Exception {
		SweetbookClient sweetbookClient = mock(SweetbookClient.class);
		PublicAssetPublishingService publicAssetPublishingService = mock(PublicAssetPublishingService.class);
		SweetbookProperties sweetbookProperties = liveSweetbookProperties();
		AppProperties appProperties = new AppProperties();
		Path demoAssetDir = Files.createTempDirectory("playpick-demo-assets");
		Files.writeString(demoAssetDir.resolve("cover.jpg"), "cover");
		Files.writeString(demoAssetDir.resolve("page-1.jpg"), "page");
		appProperties.setDemoAssetDir(demoAssetDir.toString());
		appProperties.setFrontendBaseUrl("http://localhost:3000");

		when(sweetbookClient.getBookSpecs()).thenReturn(List.of(new SweetbookViews.BookSpec("SQUAREBOOK_HC", "Square", 24, 130, 2)));
		when(sweetbookClient.getTemplates("SQUAREBOOK_HC")).thenReturn(defaultTemplates());
		when(sweetbookClient.createBook(anyMap(), anyString())).thenReturn("bk_test");
		when(publicAssetPublishingService.isConfigured()).thenReturn(true);
		when(publicAssetPublishingService.publishFile(any(Path.class), anyString()))
			.thenAnswer(invocation -> "https://gscheon.com/playpick-assets/" + invocation.getArgument(1, String.class));

		SweetbookService service = new SweetbookService(
			sweetbookClient,
			sweetbookProperties,
			appProperties,
			publicAssetPublishingService
		);

		service.prepareBookDraft(
			previewWithImages("/demo-assets/cover.jpg", "/demo-assets/page-1.jpg"),
			"ext",
			"idem",
			false
		);

		verify(publicAssetPublishingService, times(2)).publishFile(any(Path.class), anyString());
	}

	@Test
	void mixesPhotoTextTextOnlyAndGalleryTemplatesAcrossContentPages() {
		SweetbookClient sweetbookClient = mock(SweetbookClient.class);
		PublicAssetPublishingService publicAssetPublishingService = mock(PublicAssetPublishingService.class);
		SweetbookProperties sweetbookProperties = liveSweetbookProperties();
		AppProperties appProperties = new AppProperties();
		appProperties.setFrontendBaseUrl("https://playpick.example.com");

		when(sweetbookClient.getBookSpecs()).thenReturn(List.of(new SweetbookViews.BookSpec("SQUAREBOOK_HC", "Square", 24, 130, 2)));
		when(sweetbookClient.getTemplates("SQUAREBOOK_HC")).thenReturn(List.of(
			new SweetbookViews.Template("4MY2fokVjkeY", "일기장B_표지", "일기장B", "cover", ""),
			new SweetbookViews.Template("75vMl9IeyPMI", "일기장B_발행면", "일기장B", "publish", ""),
			new SweetbookViews.Template("3FhSEhJ94c0T", "일기장B_내지a_contain", "album", "content", ""),
			new SweetbookViews.Template("vHA59XPPKqak", "일기장B_내지b", "album", "content", ""),
			new SweetbookViews.Template("y5Ih0Uo7tuQ3", "일기장B_내지_gallery", "album", "content", ""),
			new SweetbookViews.Template("2mi1ao0Z4Vxl", "공용_빈내지", "album", "content", "")
		));
		when(sweetbookClient.createBook(anyMap(), anyString())).thenReturn("bk_test");
		when(publicAssetPublishingService.isConfigured()).thenReturn(false);

		List<String> templateUids = new ArrayList<>();
		doAnswer(invocation -> {
			templateUids.add(invocation.getArgument(1));
			return null;
		}).when(sweetbookClient).addContents(anyString(), anyString(), anyMap(), anyString());

		SweetbookService service = new SweetbookService(
			sweetbookClient,
			sweetbookProperties,
			appProperties,
			publicAssetPublishingService
		);

		service.prepareBookDraft(previewWithCuratedImages(24), "ext", "idem", false);

		assertThat(templateUids)
			.isNotEmpty()
			.filteredOn(uid -> !"75vMl9IeyPMI".equals(uid) && !"2mi1ao0Z4Vxl".equals(uid))
			.contains("3FhSEhJ94c0T", "vHA59XPPKqak", "y5Ih0Uo7tuQ3");
	}

	@Test
	void distributesAllCuratedImagesAcrossGalleryLayoutsWithinMinimumPagePlan() {
		SweetbookClient sweetbookClient = mock(SweetbookClient.class);
		PublicAssetPublishingService publicAssetPublishingService = mock(PublicAssetPublishingService.class);
		SweetbookProperties sweetbookProperties = liveSweetbookProperties();
		AppProperties appProperties = new AppProperties();
		appProperties.setFrontendBaseUrl("https://playpick.example.com");

		when(sweetbookClient.getBookSpecs()).thenReturn(List.of(new SweetbookViews.BookSpec("SQUAREBOOK_HC", "Square", 24, 130, 2)));
		when(sweetbookClient.getTemplates("SQUAREBOOK_HC")).thenReturn(defaultTemplates());
		when(sweetbookClient.createBook(anyMap(), anyString())).thenReturn("bk_test");
		when(publicAssetPublishingService.isConfigured()).thenReturn(false);

		List<Map<String, Object>> contentPayloads = new ArrayList<>();
		doAnswer(invocation -> {
			contentPayloads.add(invocation.getArgument(2));
			return null;
		}).when(sweetbookClient).addContents(anyString(), anyString(), anyMap(), anyString());

		SweetbookService service = new SweetbookService(
			sweetbookClient,
			sweetbookProperties,
			appProperties,
			publicAssetPublishingService
		);

		ProjectViews.Preview preview = previewWithCuratedImages(70);
		ProjectViews.BookGeneration generation = service.prepareBookDraft(preview, "ext", "idem", false);

		LinkedHashSet<String> usedImageUrls = new LinkedHashSet<>();
		List<List<String>> galleryPayloads = new ArrayList<>();
		for (Map<String, Object> params : contentPayloads) {
			Object photosValue = params.get("photos");
			if (photosValue instanceof List<?> photos) {
				List<String> galleryUrls = new ArrayList<>();
				for (Object photo : photos) {
					if (photo instanceof String imageUrl && !imageUrl.isBlank()) {
						usedImageUrls.add(imageUrl);
						galleryUrls.add(imageUrl);
					}
				}
				galleryPayloads.add(galleryUrls);
			}
		}

		assertThat(generation.plannedPageCount()).isEqualTo(24);
		assertThat(usedImageUrls)
			.filteredOn(url -> url.startsWith("https://playpick.example.com/demo-assets/generated/"))
			.hasSize(40);
		assertThat(galleryPayloads)
			.isNotEmpty()
			.allSatisfy(photos -> assertThat(photos).hasSizeBetween(1, 4));
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
		properties.setDefaultDividerTemplateUid("");
		properties.setDefaultBlankTemplateUid("2mi1ao0Z4Vxl");
		return properties;
	}

	private List<SweetbookViews.Template> defaultTemplates() {
		return List.of(
			new SweetbookViews.Template("4MY2fokVjkeY", "일기장B_표지", "일기장B", "cover", ""),
			new SweetbookViews.Template("75vMl9IeyPMI", "일기장B_발행면", "일기장B", "publish", ""),
			new SweetbookViews.Template("3FhSEhJ94c0T", "일기장B_내지a_contain", "album", "content", ""),
			new SweetbookViews.Template("vHA59XPPKqak", "일기장B_내지b", "album", "content", ""),
			new SweetbookViews.Template("y5Ih0Uo7tuQ3", "일기장B_내지_gallery", "album", "content", ""),
			new SweetbookViews.Template("2mi1ao0Z4Vxl", "공용_빈내지", "album", "content", "")
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

	private ProjectViews.Preview previewWithCuratedImages(int imageCount) {
		List<EditionViews.CuratedAsset> curatedAssets = new ArrayList<>();
		for (int index = 1; index <= imageCount; index++) {
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
				"4MY2fokVjkeY",
				"75vMl9IeyPMI",
				"3FhSEhJ94c0T",
				Map.of("title", "인트로", "message", "안녕하세요"),
				Map.of("title", "아웃트로", "message", "고마워요"),
				Instant.parse("2026-04-08T00:00:00Z"),
				curatedAssets,
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
				new ProjectViews.Page("cover", "표지", "설명", "https://playpick.example.com/demo-assets/cover.jpg", Map.of()),
				new ProjectViews.Page("official-intro", "인트로", "설명", "https://playpick.example.com/demo-assets/intro.jpg", Map.of()),
				new ProjectViews.Page("relationship", "관계", "설명", "", Map.of()),
				new ProjectViews.Page("fan-pick", "픽", "설명", "https://playpick.example.com/demo-assets/pick.jpg", Map.of()),
				new ProjectViews.Page("fan-note", "팬노트", "설명", "https://playpick.example.com/demo-assets/note.jpg", Map.of()),
				new ProjectViews.Page("official-closing", "클로징", "설명", "", Map.of())
			)
		);
	}
}
