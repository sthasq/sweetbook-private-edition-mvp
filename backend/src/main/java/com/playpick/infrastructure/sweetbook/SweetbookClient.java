package com.playpick.infrastructure.sweetbook;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.playpick.application.AppException;
import com.playpick.application.SweetbookViews;
import com.playpick.config.SweetbookProperties;
import io.netty.handler.ssl.SslContextBuilder;
import java.io.InputStream;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

@Component
@RequiredArgsConstructor
public class SweetbookClient {

	private static final TypeReference<LinkedHashMap<String, Object>> MAP_TYPE = new TypeReference<>() {
	};

	private final WebClient.Builder webClientBuilder;
	private final ObjectMapper objectMapper;
	private final SweetbookProperties sweetbookProperties;

	public List<SweetbookViews.BookSpec> getBookSpecs() {
		List<SweetbookViews.BookSpec> result = new ArrayList<>();
		for (JsonNode item : extractArray(getJson("/book-specs"))) {
			String uid = field(item, "uid", "bookSpecUid");
			String name = field(item, "name", "displayName", "title");
			if (uid.isBlank() || name.isBlank()) {
				continue;
			}
			result.add(new SweetbookViews.BookSpec(
				uid,
				name,
				intField(item, "minPages", "minimumPages"),
				intField(item, "maxPages", "maximumPages"),
				intField(item, "pageIncrement", "pagesPerIncrement", "pageStep", "increment")
			));
		}
		return result;
	}

	public List<SweetbookViews.Template> getTemplates(String bookSpecUid) {
		List<SweetbookViews.Template> result = new ArrayList<>();
		for (JsonNode item : extractArray(getJson("/templates?bookSpecUid=" + bookSpecUid))) {
			result.add(new SweetbookViews.Template(
				field(item, "uid", "templateUid"),
				field(item, "name", "templateName", "displayName", "title"),
				field(item, "category", "group", "theme"),
				field(item, "role", "templateKind", "type", "kind"),
				nestedField(item, new String[][] {
					{"thumbnails", "layout"},
					{"thumbnail", "layout"},
					{"thumbnail"},
					{"thumbnailUrl"}
				})
			));
		}
		return result;
	}

	public SweetbookViews.TemplateDetail getTemplateDetail(String templateUid) {
		JsonNode item = unwrapEnvelope(getJson("/templates/" + templateUid));
		return new SweetbookViews.TemplateDetail(
			field(item, "uid", "templateUid"),
			field(item, "name", "templateName", "displayName", "title"),
			field(item, "category", "group"),
			field(item, "role", "templateKind", "type", "kind"),
			field(item, "theme"),
			nestedField(item, new String[][] {
				{"thumbnails", "layout"},
				{"thumbnail", "layout"},
				{"thumbnail"},
				{"thumbnailUrl"}
			}),
			toMap(item.path("parameters")),
			toMap(item.path("layout")),
			toMap(item.path("layoutRules")),
			toMap(item.path("baseLayer"))
		);
	}

	public String createBook(Map<String, Object> payload, String idempotencyKey) {
		JsonNode response = unwrapEnvelope(postJson("/books", payload, headers -> {
			if (idempotencyKey != null && !idempotencyKey.isBlank()) {
				headers.add("Idempotency-Key", idempotencyKey);
			}
		}));
		return field(response, "bookUid", "uid", "id");
	}

	public void addCover(String bookUid, String templateUid, Map<String, Object> params) {
		postMultipart("/books/" + bookUid + "/cover", templateUid, params, null);
	}

	public void addContents(String bookUid, String templateUid, Map<String, Object> params, String breakBefore) {
		postMultipart("/books/" + bookUid + "/contents", templateUid, params, breakBefore);
	}

	public void finalizeBook(String bookUid) {
		postJson("/books/" + bookUid + "/finalization", Map.of());
	}

	public Map<String, Object> estimateOrder(Map<String, Object> payload) {
		JsonNode response = unwrapEnvelope(postJson("/orders/estimate", payload));
		Map<String, Object> result = toMap(response);
		result.putIfAbsent("currency", field(response, "currency", "currencyCode"));
		result.putIfAbsent("totalAmount", field(response, "totalAmount", "amount", "totalPrice"));
		result.putIfAbsent("shippingFee", field(response, "shippingFee", "shippingAmount"));
		return result;
	}

	public Map<String, Object> createOrder(Map<String, Object> payload, String idempotencyKey) {
		JsonNode response = unwrapEnvelope(postJson("/orders", payload, headers -> headers.add("Idempotency-Key", idempotencyKey)));
		Map<String, Object> result = toMap(response);
		result.putIfAbsent("orderUid", field(response, "orderUid", "uid", "id"));
		result.putIfAbsent("status", field(response, "status", "orderStatus"));
		result.putIfAbsent("totalAmount", field(response, "totalAmount", "amount", "totalPrice"));
		return result;
	}

	private JsonNode getJson(String path) {
		return baseClient().get()
			.uri(path)
			.retrieve()
			.onStatus(status -> status.isError(), response -> response.bodyToMono(String.class)
				.map(body -> new AppException(HttpStatus.BAD_GATEWAY, "Sweetbook API error: " + body)))
			.bodyToMono(JsonNode.class)
			.block(Duration.ofSeconds(30));
	}

	private JsonNode postJson(String path, Map<String, Object> payload) {
		return postJson(path, payload, headers -> {
		});
	}

	private JsonNode postJson(String path, Map<String, Object> payload, Consumer<HttpHeaders> headerCustomizer) {
		return baseClient().post()
			.uri(path)
			.headers(headerCustomizer)
			.contentType(MediaType.APPLICATION_JSON)
			.bodyValue(payload)
			.retrieve()
			.onStatus(status -> status.isError(), response -> response.bodyToMono(String.class)
				.map(body -> new AppException(HttpStatus.BAD_GATEWAY, "Sweetbook API error: " + body)))
			.bodyToMono(JsonNode.class)
			.block(Duration.ofSeconds(30));
	}

	private void postMultipart(String path, String templateUid, Map<String, Object> params, String breakBefore) {
		MultipartBodyBuilder multipartBodyBuilder = new MultipartBodyBuilder();
		multipartBodyBuilder.part("templateUid", templateUid);
		try {
			multipartBodyBuilder.part("parameters", objectMapper.writeValueAsString(params));
		} catch (Exception exception) {
			throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize Sweetbook params", exception);
		}
		if (breakBefore != null && !breakBefore.isBlank()) {
			multipartBodyBuilder.part("breakBefore", breakBefore);
		}

		baseClient().post()
			.uri(path)
			.contentType(MediaType.MULTIPART_FORM_DATA)
			.body(BodyInserters.fromMultipartData(multipartBodyBuilder.build()))
			.retrieve()
			.onStatus(status -> status.isError(), response -> response.bodyToMono(String.class)
				.map(body -> new AppException(HttpStatus.BAD_GATEWAY, "Sweetbook API error: " + body)))
			.toBodilessEntity()
			.block(Duration.ofSeconds(30));
	}

	private WebClient baseClient() {
		return webClientBuilder.clone()
			.clientConnector(sweetbookClientConnector())
			.baseUrl(sweetbookProperties.getBaseUrl())
			.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + sweetbookProperties.getApiKey())
			.defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
			.build();
	}

	private ReactorClientHttpConnector sweetbookClientConnector() {
		try (InputStream certificateStream = new ClassPathResource(
			"certs/sectigo-public-server-authentication-root-r46.pem"
		).getInputStream()) {
			var sslContext = SslContextBuilder.forClient()
				.trustManager(certificateStream)
				.build();
			HttpClient httpClient = HttpClient.create()
				.secure(sslSpec -> sslSpec.sslContext(sslContext));
			return new ReactorClientHttpConnector(httpClient);
		} catch (Exception exception) {
			throw new AppException(
				HttpStatus.INTERNAL_SERVER_ERROR,
				"Failed to initialize Sweetbook SSL trust configuration",
				exception
			);
		}
	}

	private Iterable<JsonNode> extractArray(JsonNode node) {
		JsonNode payload = unwrapEnvelope(node);
		if (payload == null || payload.isNull()) {
			return List.of();
		}
		if (payload.isArray()) {
			return payload;
		}
		if (payload.has("templates")) {
			return payload.path("templates");
		}
		if (payload.has("items")) {
			return payload.path("items");
		}
		if (payload.has("content")) {
			return payload.path("content");
		}
		if (payload.has("data")) {
			return extractArray(payload.path("data"));
		}
		return List.of();
	}

	private JsonNode unwrapEnvelope(JsonNode node) {
		if (node == null || node.isNull()) {
			return node;
		}
		if (node.has("data") && !node.path("data").isMissingNode()) {
			return node.path("data");
		}
		return node;
	}

	private String field(JsonNode node, String... names) {
		for (String name : names) {
			JsonNode candidate = node.path(name);
			if (!candidate.isMissingNode() && !candidate.isNull() && !candidate.asText().isBlank()) {
				return candidate.asText();
			}
		}
		return "";
	}

	private Integer intField(JsonNode node, String... names) {
		for (String name : names) {
			JsonNode candidate = node.path(name);
			if (!candidate.isMissingNode() && !candidate.isNull()) {
				return candidate.asInt();
			}
		}
		return null;
	}

	private String nestedField(JsonNode node, String[][] paths) {
		for (String[] path : paths) {
			JsonNode candidate = node;
			for (String segment : path) {
				candidate = candidate.path(segment);
			}
			if (!candidate.isMissingNode() && !candidate.isNull() && !candidate.asText().isBlank()) {
				return candidate.asText();
			}
		}
		return "";
	}

	private Map<String, Object> toMap(JsonNode node) {
		if (node == null || node.isNull()) {
			return new LinkedHashMap<>();
		}
		return objectMapper.convertValue(node, MAP_TYPE);
	}
}
