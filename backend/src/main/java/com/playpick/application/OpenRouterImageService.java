package com.playpick.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.playpick.config.AppProperties;
import com.playpick.config.OpenRouterProperties;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@Slf4j
@RequiredArgsConstructor
public class OpenRouterImageService {

	private static final int OPENROUTER_RESPONSE_BUFFER_SIZE = 25 * 1024 * 1024;

	private final OpenRouterProperties properties;
	private final AppProperties appProperties;
	private final WebClient.Builder webClientBuilder;
	private final ObjectMapper objectMapper;

	public ProjectViews.AiCollabGeneration generatePaniCollab(ProjectCommands.GenerateAiCollab command) {
		if (!properties.isImageReady()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "OpenRouter is not configured");
		}

		String templateLabel = resolveTemplateLabel(command.templateKey());
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("model", properties.getImageModel());
		payload.put("modalities", List.of("image", "text"));
		payload.put("messages", List.of(Map.of(
			"role", "user",
			"content", List.of(
				Map.of("type", "text", "text", buildPrompt(command.templateKey(), templateLabel)),
				Map.of("type", "image_url", "image_url", Map.of("url", command.sourceImageUrl())),
				Map.of("type", "image_url", "image_url", Map.of("url", command.officialImageUrl()))
			)
		)));
		payload.put("image_config", Map.of(
			"aspect_ratio", "4:3",
			"image_size", "1K"
		));

		try {
			OpenRouterResponse response = webClientBuilder
				.clone()
				.exchangeStrategies(ExchangeStrategies.builder()
					.codecs(configurer -> configurer.defaultCodecs()
						.maxInMemorySize(OPENROUTER_RESPONSE_BUFFER_SIZE))
					.build())
				.build()
				.post()
				.uri(properties.getBaseUrl() + "/chat/completions")
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getApiKey())
				.header("HTTP-Referer", appProperties.getFrontendBaseUrl())
				.header("X-OpenRouter-Title", "PlayPick")
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(payload)
				.exchangeToMono(clientResponse -> clientResponse.bodyToMono(String.class)
					.defaultIfEmpty("")
					.map(body -> new OpenRouterResponse(clientResponse.statusCode(), body)))
				.block();

			if (response == null) {
				throw new AppException(HttpStatus.BAD_GATEWAY, "OpenRouter did not return a response");
			}
			if (response.statusCode().isError()) {
				log.warn(
					"OpenRouter image generation failed with status {} and body: {}",
					response.statusCode().value(),
					summarizeBody(response.body())
				);
				throw new AppException(
					HttpStatus.BAD_GATEWAY,
					extractErrorMessage(response.statusCode(), response.body())
				);
			}

			return parseGenerationResponse(command.templateKey(), templateLabel, response.body());
		} catch (AppException exception) {
			throw exception;
		} catch (Exception exception) {
			throw new AppException(HttpStatus.BAD_GATEWAY, "OpenRouter image generation failed", exception);
		}
	}

	private ProjectViews.AiCollabGeneration parseGenerationResponse(
		String templateKey,
		String templateLabel,
		String body
	) {
		try {
			JsonNode root = objectMapper.readTree(body);
			JsonNode images = root.path("choices").path(0).path("message").path("images");
			if (images.isMissingNode() || images.isNull()) {
				throw new AppException(HttpStatus.BAD_GATEWAY, "OpenRouter did not return any images");
			}

			List<ProjectViews.AiCollabCandidate> candidates = new java.util.ArrayList<>();
			if (images.isArray()) {
				for (int index = 0; index < images.size(); index++) {
					appendCandidate(candidates, images.path(index), templateKey, templateLabel, index);
				}
			} else {
				appendCandidate(candidates, images, templateKey, templateLabel, 0);
			}

			if (candidates.isEmpty()) {
				throw new AppException(HttpStatus.BAD_GATEWAY, "OpenRouter did not return a usable image");
			}

			return new ProjectViews.AiCollabGeneration(
				"OPENROUTER",
				properties.getImageModel(),
				candidates
			);
		} catch (IOException exception) {
			throw new AppException(HttpStatus.BAD_GATEWAY, "Failed to parse OpenRouter response", exception);
		}
	}

	private void appendCandidate(
		List<ProjectViews.AiCollabCandidate> candidates,
		JsonNode imageNode,
		String templateKey,
		String templateLabel,
		int index
	) {
		String imageUrl = imageNode.path("image_url").path("url").asText("");
		if (imageUrl.isBlank()) {
			return;
		}
		String suffix = index == 0 ? "AI 컷" : "AI 컷 " + (index + 1);
		candidates.add(new ProjectViews.AiCollabCandidate(
			UUID.randomUUID().toString(),
			templateKey,
			templateLabel,
			templateLabel + " " + suffix,
			imageUrl,
			"OPENROUTER"
		));
	}

	private String resolveTemplateLabel(String templateKey) {
		return switch (templateKey) {
			case "travel-selfie" -> "여행 동행 셀카";
			case "passport-poster" -> "트래블 포스터 컷";
			case "night-train" -> "야간 열차 기념컷";
			default -> throw new AppException(HttpStatus.BAD_REQUEST, "Unsupported collab template: " + templateKey);
		};
	}

	private String buildPrompt(String templateKey, String templateLabel) {
		String sceneDirection = switch (templateKey) {
			case "travel-selfie" ->
				"Create a warm travel selfie mood with both people naturally framed together in a bright scenic destination.";
			case "passport-poster" ->
				"Create a stylish travel poster collage with postcard energy, layered paper details, and a polished editorial souvenir look.";
			case "night-train" ->
				"Create a calm night train memory cut with soft window light, cinematic shadows, and a reflective travel diary mood.";
			default -> throw new AppException(HttpStatus.BAD_REQUEST, "Unsupported collab template: " + templateKey);
		};

		return """
			Create one polished official fan collaboration image for a merch preview.
			The first image is the fan photo.
			The second image is the creator-approved reference photo.
			Keep the creator recognizable from the approved reference while making the result feel like an official collaboration cut, not a paparazzi photo.
			%s
			Output a single 4:3 image with both people visible together, natural proportions, clean hands, clean faces, and coherent lighting.
			Keep the look premium, warm, and travel-editorial.
			Do not add text, logos, captions, watermarks, UI chrome, or extra people.
			Template: %s.
			""".formatted(sceneDirection, templateLabel).trim();
	}

	private String extractErrorMessage(HttpStatusCode statusCode, String body) {
		try {
			JsonNode node = objectMapper.readTree(body);
			String message = node.path("error").path("message").asText("");
			if (!message.isBlank()) {
				return message;
			}
			message = node.path("message").asText("");
			if (!message.isBlank()) {
				return message;
			}
			String statusMessage = node.path("error").path("metadata").path("raw").asText("");
			if (!statusMessage.isBlank()) {
				return statusMessage;
			}
		} catch (IOException ignored) {
			// Fall through to a shortened body preview.
		}
		String bodyPreview = summarizeBody(body);
		return bodyPreview.isBlank()
			? "OpenRouter image generation failed (HTTP %s)".formatted(statusCode.value())
			: bodyPreview;
	}

	private String summarizeBody(String body) {
		String normalized = body == null ? "" : body.replaceAll("\\s+", " ").trim();
		if (normalized.length() <= 240) {
			return normalized;
		}
		return normalized.substring(0, 237) + "...";
	}

	private record OpenRouterResponse(HttpStatusCode statusCode, String body) {
	}
}
