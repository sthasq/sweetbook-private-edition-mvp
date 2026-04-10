package com.playpick.infrastructure.youtube;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.playpick.application.AppException;
import com.playpick.config.GoogleProperties;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class YouTubeClient {

	private static final TypeReference<LinkedHashMap<String, Object>> MAP_TYPE = new TypeReference<>() {
	};
	private static final int YOUTUBE_RESPONSE_BUFFER_SIZE = 2 * 1024 * 1024;

	private final WebClient.Builder webClientBuilder;
	private final ObjectMapper objectMapper;

	public Map<String, Object> exchangeCode(String code, GoogleProperties googleProperties) {
		MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
		formData.add("code", code);
		formData.add("client_id", googleProperties.getClientId());
		formData.add("client_secret", googleProperties.getClientSecret());
		formData.add("redirect_uri", googleProperties.getRedirectUri());
		formData.add("grant_type", "authorization_code");

		JsonNode response = webClientBuilder.clone()
			.baseUrl("https://oauth2.googleapis.com")
			.exchangeStrategies(largeResponseStrategies())
			.build()
			.post()
			.uri("/token")
			.contentType(MediaType.APPLICATION_FORM_URLENCODED)
			.body(BodyInserters.fromFormData(formData))
			.retrieve()
			.onStatus(status -> status.isError(), clientResponse -> clientResponse.bodyToMono(String.class)
				.map(body -> new AppException(HttpStatus.BAD_GATEWAY, "Google OAuth token exchange failed: " + body)))
			.bodyToMono(JsonNode.class)
			.block(Duration.ofSeconds(30));

		return objectMapper.convertValue(response, MAP_TYPE);
	}

	public JsonNode getYouTubeResource(String path, Map<String, String> queryParams, String accessToken, String apiKey) {
		return webClientBuilder.clone()
			.baseUrl("https://www.googleapis.com")
			.exchangeStrategies(largeResponseStrategies())
			.build()
			.get()
			.uri(uriBuilder -> {
				var builder = uriBuilder.path(path);
				queryParams.forEach(builder::queryParam);
				if ((accessToken == null || accessToken.isBlank()) && apiKey != null && !apiKey.isBlank()) {
					builder.queryParam("key", apiKey);
				}
				return builder.build();
			})
			.headers(headers -> {
				headers.set(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
				if (accessToken != null && !accessToken.isBlank()) {
					headers.setBearerAuth(accessToken);
				}
			})
			.retrieve()
			.onStatus(status -> status.isError(), response -> response.bodyToMono(String.class)
				.map(body -> new AppException(HttpStatus.BAD_GATEWAY, "YouTube API error: " + body)))
			.bodyToMono(JsonNode.class)
			.block(Duration.ofSeconds(30));
	}

	private ExchangeStrategies largeResponseStrategies() {
		return ExchangeStrategies.builder()
			.codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(YOUTUBE_RESPONSE_BUFFER_SIZE))
			.build();
	}
}
