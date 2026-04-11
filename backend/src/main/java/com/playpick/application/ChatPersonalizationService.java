package com.playpick.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.playpick.config.AppProperties;
import com.playpick.config.OpenRouterProperties;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@Slf4j
@RequiredArgsConstructor
public class ChatPersonalizationService {

	private static final int MAX_MESSAGES = 24;
	private static final int MAX_MESSAGE_LENGTH = 1200;

	private final OpenRouterProperties properties;
	private final AppProperties appProperties;
	private final WebClient.Builder webClientBuilder;
	private final ObjectMapper objectMapper;

	public ProjectViews.ChatPersonalization chat(
		EditionViews.Detail edition,
		Map<String, Object> personalizationData,
		List<ProjectCommands.ChatMessage> messages
	) {
		if (!properties.isChatReady()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "OpenRouter is not configured");
		}

		List<EditionViews.PersonalizationField> fields = resolveFields(edition);
		List<ProjectCommands.ChatMessage> safeMessages = sanitizeMessages(messages);
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("model", properties.getChatModel());
		payload.put("response_format", Map.of("type", "json_object"));
		payload.put("messages", buildOpenRouterMessages(
			edition,
			personalizationData == null ? Map.of() : personalizationData,
			fields,
			safeMessages
		));

		try {
			OpenRouterResponse response = webClientBuilder
				.clone()
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
					"OpenRouter chat generation failed with status {} and body: {}",
					response.statusCode().value(),
					summarizeBody(response.body())
				);
				throw new AppException(
					HttpStatus.BAD_GATEWAY,
					extractErrorMessage(response.statusCode(), response.body())
				);
			}

			return parseChatResponse(response.body(), fields);
		} catch (AppException exception) {
			throw exception;
		} catch (Exception exception) {
			throw new AppException(HttpStatus.BAD_GATEWAY, "OpenRouter chat generation failed", exception);
		}
	}

	private ProjectViews.ChatPersonalization parseChatResponse(
		String body,
		List<EditionViews.PersonalizationField> fields
	) {
		try {
			JsonNode root = objectMapper.readTree(body);
			String assistantContent = extractAssistantContent(root);
			JsonNode structured = parseStructuredPayload(assistantContent);

			String reply = structured.path("reply").asText("").trim();
			if (reply.isBlank()) {
				throw new AppException(HttpStatus.BAD_GATEWAY, "OpenRouter chat reply was empty");
			}

			boolean done = structured.path("done").asBoolean(false);
			Map<String, Object> proposal = normalizeProposal(structured.path("proposal"), fields);
			boolean completed = done && proposal != null && !proposal.isEmpty();
			return new ProjectViews.ChatPersonalization(reply, proposal, completed);
		} catch (IOException exception) {
			throw new AppException(HttpStatus.BAD_GATEWAY, "Failed to parse OpenRouter chat response", exception);
		}
	}

	private List<Map<String, Object>> buildOpenRouterMessages(
		EditionViews.Detail edition,
		Map<String, Object> personalizationData,
		List<EditionViews.PersonalizationField> fields,
		List<ProjectCommands.ChatMessage> messages
	) {
		List<Map<String, Object>> result = new ArrayList<>();
		result.add(Map.of("role", "system", "content", buildSystemPrompt(edition, personalizationData, fields)));
		for (ProjectCommands.ChatMessage message : messages) {
			result.add(Map.of(
				"role", message.role().trim().toLowerCase(),
				"content", message.content()
			));
		}
		return result;
	}

	private String buildSystemPrompt(
		EditionViews.Detail edition,
		Map<String, Object> personalizationData,
		List<EditionViews.PersonalizationField> fields
	) {
		Map<String, Object> existingValues = extractExistingFieldValues(personalizationData, fields);
		String fieldGuide = describeFields(fields);
		String allowedKeys = fields.stream()
			.map(EditionViews.PersonalizationField::fieldKey)
			.distinct()
			.reduce((left, right) -> left + ", " + right)
			.orElse("fanNickname, favoriteMemory, fanMessage");

		return """
			You are a Korean assistant that helps a fan personalize a photobook edition.
			Edition title: %s
			Edition subtitle: %s
			Creator: %s
			Official intro: %s
			Current saved personalization values: %s
			Field definitions:
			%s
			Available video picks (if any): %s

			Conversation policy:
			- Ask concise and warm Korean questions.
			- Ask one focused question per turn.
			- Gather enough information in 2-4 questions when possible.
			- On the very first turn, start with a brief warm greeting and the easiest welcoming question.
			- Prefer emotionally natural questions over rigid form-like wording.
			- Do not ask the fan to confirm saved values unless they already asked to revise them.
			- If the user asks for revisions after a proposal, refine and return an updated proposal.

			Output policy (critical):
			- Reply with ONLY valid JSON.
			- Never wrap in markdown.
			- Use this shape exactly:
			  {"reply":"...", "done":false, "proposal":null}
			  or
			  {"reply":"...", "done":true, "proposal":{"fieldKey":"value"}}
			- proposal keys must be from: %s
			- proposal values should be concise and natural Korean.
			- For DATE, use YYYY-MM-DD.
			- For IMAGE_URL, do not invent URLs. Use only user-provided URLs.
			""".formatted(
			edition.title(),
			nullToEmpty(edition.subtitle()),
			edition.creator().displayName(),
			serializeForPrompt(edition.snapshot() == null ? Map.of() : edition.snapshot().officialIntro()),
			serializeForPrompt(existingValues),
			fieldGuide,
			describeTopVideos(personalizationData),
			allowedKeys
		).trim();
	}

	private String describeFields(List<EditionViews.PersonalizationField> fields) {
		StringJoiner joiner = new StringJoiner("\n");
		for (EditionViews.PersonalizationField field : fields) {
			joiner.add("- key=%s, label=%s, type=%s, required=%s, maxLength=%s".formatted(
				field.fieldKey(),
				field.label(),
				field.inputType(),
				field.required(),
				field.maxLength() == null ? "-" : field.maxLength().toString()
			));
		}
		return joiner.toString();
	}

	private String describeTopVideos(Map<String, Object> personalizationData) {
		Object raw = personalizationData.get("topVideos");
		if (!(raw instanceof List<?> list) || list.isEmpty()) {
			return "[]";
		}

		List<Map<String, Object>> videos = new ArrayList<>();
		for (Object item : list) {
			if (!(item instanceof Map<?, ?> map)) {
				continue;
			}
			Map<String, Object> next = new LinkedHashMap<>();
			next.put("videoId", map.get("videoId"));
			next.put("title", map.get("title"));
			videos.add(next);
		}
		return serializeForPrompt(videos);
	}

	private Map<String, Object> extractExistingFieldValues(
		Map<String, Object> personalizationData,
		List<EditionViews.PersonalizationField> fields
	) {
		Map<String, Object> result = new LinkedHashMap<>();
		Set<String> allowed = new LinkedHashSet<>();
		for (EditionViews.PersonalizationField field : fields) {
			allowed.add(field.fieldKey());
		}
		for (String key : allowed) {
			Object value = personalizationData.get(key);
			if (value != null) {
				result.put(key, value);
			}
		}
		return result;
	}

	private List<ProjectCommands.ChatMessage> sanitizeMessages(List<ProjectCommands.ChatMessage> messages) {
		if (messages == null || messages.isEmpty()) {
			return List.of();
		}

		List<ProjectCommands.ChatMessage> result = new ArrayList<>();
		int start = Math.max(messages.size() - MAX_MESSAGES, 0);
		for (int index = start; index < messages.size(); index++) {
			ProjectCommands.ChatMessage message = messages.get(index);
			if (message == null) {
				continue;
			}
			String role = nullToEmpty(message.role()).trim().toLowerCase();
			if (!"user".equals(role) && !"assistant".equals(role)) {
				continue;
			}
			String content = nullToEmpty(message.content()).trim();
			if (content.isBlank()) {
				continue;
			}
			if (content.length() > MAX_MESSAGE_LENGTH) {
				content = content.substring(0, MAX_MESSAGE_LENGTH);
			}
			result.add(new ProjectCommands.ChatMessage(role, content));
		}
		return result;
	}

	private Map<String, Object> normalizeProposal(
		JsonNode proposalNode,
		List<EditionViews.PersonalizationField> fields
	) {
		if (proposalNode == null || proposalNode.isMissingNode() || proposalNode.isNull() || !proposalNode.isObject()) {
			return null;
		}

		Map<String, EditionViews.PersonalizationField> fieldByKey = new LinkedHashMap<>();
		for (EditionViews.PersonalizationField field : fields) {
			fieldByKey.put(field.fieldKey(), field);
		}

		Map<String, Object> result = new LinkedHashMap<>();
		proposalNode.fields().forEachRemaining(entry -> {
			EditionViews.PersonalizationField field = fieldByKey.get(entry.getKey());
			if (field == null) {
				return;
			}
			Object value = normalizeFieldValue(field, entry.getValue());
			if (value != null) {
				result.put(field.fieldKey(), value);
			}
		});

		return result.isEmpty() ? null : result;
	}

	private Object normalizeFieldValue(EditionViews.PersonalizationField field, JsonNode valueNode) {
		String normalizedType = nullToEmpty(field.inputType()).trim().toUpperCase();
		if ("NUMBER".equals(normalizedType)) {
			if (valueNode.isNumber()) {
				return valueNode.numberValue();
			}
			String textValue = valueNode.asText("").trim();
			if (textValue.isBlank()) {
				return null;
			}
			try {
				return Long.parseLong(textValue);
			} catch (NumberFormatException ignored) {
				return null;
			}
		}

		String textValue = valueNode.asText("").trim();
		if (textValue.isBlank()) {
			return null;
		}
		if ("DATE".equals(normalizedType) && textValue.length() >= 10) {
			textValue = textValue.substring(0, 10);
		}
		if (field.maxLength() != null && field.maxLength() > 0 && textValue.length() > field.maxLength()) {
			textValue = textValue.substring(0, field.maxLength());
		}
		return textValue;
	}

	private JsonNode parseStructuredPayload(String content) throws JsonProcessingException {
		String trimmed = nullToEmpty(content).trim();
		if (trimmed.isBlank()) {
			throw new AppException(HttpStatus.BAD_GATEWAY, "OpenRouter chat message was empty");
		}

		JsonNode direct = readJsonObject(trimmed);
		if (direct != null) {
			return direct;
		}

		String unwrapped = trimmed
			.replaceFirst("^```json\\s*", "")
			.replaceFirst("^```\\s*", "")
			.replaceFirst("\\s*```$", "")
			.trim();

		JsonNode unwrappedJson = readJsonObject(unwrapped);
		if (unwrappedJson != null) {
			return unwrappedJson;
		}

		int firstBrace = unwrapped.indexOf('{');
		int lastBrace = unwrapped.lastIndexOf('}');
		if (firstBrace >= 0 && lastBrace > firstBrace) {
			JsonNode extracted = readJsonObject(unwrapped.substring(firstBrace, lastBrace + 1));
			if (extracted != null) {
				return extracted;
			}
		}

		throw new AppException(HttpStatus.BAD_GATEWAY, "OpenRouter did not return structured chat JSON");
	}

	private JsonNode readJsonObject(String raw) throws JsonProcessingException {
		try {
			JsonNode node = objectMapper.readTree(raw);
			return node != null && node.isObject() ? node : null;
		} catch (JsonProcessingException exception) {
			return null;
		}
	}

	private String extractAssistantContent(JsonNode responseRoot) {
		JsonNode contentNode = responseRoot.path("choices").path(0).path("message").path("content");
		if (contentNode.isTextual()) {
			return contentNode.asText("");
		}
		if (contentNode.isArray()) {
			StringJoiner joiner = new StringJoiner("\n");
			for (JsonNode item : contentNode) {
				String text = item.path("text").asText("");
				if (!text.isBlank()) {
					joiner.add(text);
				}
			}
			String combined = joiner.toString().trim();
			if (!combined.isBlank()) {
				return combined;
			}
		}
		if (contentNode.isObject() && contentNode.has("text")) {
			return contentNode.path("text").asText("");
		}
		throw new AppException(HttpStatus.BAD_GATEWAY, "OpenRouter did not return a chat message");
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
			// Fall through to body preview.
		}
		String bodyPreview = summarizeBody(body);
		return bodyPreview.isBlank()
			? "OpenRouter chat generation failed (HTTP %s)".formatted(statusCode.value())
			: bodyPreview;
	}

	private String summarizeBody(String body) {
		String normalized = body == null ? "" : body.replaceAll("\\s+", " ").trim();
		if (normalized.length() <= 240) {
			return normalized;
		}
		return normalized.substring(0, 237) + "...";
	}

	private List<EditionViews.PersonalizationField> resolveFields(EditionViews.Detail edition) {
		if (edition.snapshot() == null || edition.snapshot().personalizationFields() == null) {
			return List.of();
		}
		return edition.snapshot().personalizationFields();
	}

	private String serializeForPrompt(Object value) {
		try {
			return objectMapper.writeValueAsString(value);
		} catch (JsonProcessingException exception) {
			return "{}";
		}
	}

	private String nullToEmpty(String value) {
		return value == null ? "" : value;
	}

	private record OpenRouterResponse(HttpStatusCode statusCode, String body) {
	}
}
