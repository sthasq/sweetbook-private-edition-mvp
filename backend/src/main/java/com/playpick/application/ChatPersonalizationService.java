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
	private static final int BOOK_COPY_TITLE_MAX_LENGTH = 48;
	private static final int BOOK_COPY_BODY_MAX_LENGTH = 180;

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

			// Non-fatal JSON parse: if the LLM returned plain text, use it directly as the reply.
			JsonNode structured = tryParseStructuredPayload(assistantContent);

			if (structured == null) {
				String plainReply = assistantContent.trim();
				if (plainReply.isBlank()) {
					log.warn("ChatPersonalization: LLM returned empty content, returning safe fallback");
					return new ProjectViews.ChatPersonalization("잠시 후 다시 시도해 주세요.", null, false);
				}
				log.debug("ChatPersonalization: LLM returned plain text – using as reply directly");
				return new ProjectViews.ChatPersonalization(plainReply, null, false);
			}

			String reply = extractReplyText(structured, assistantContent);
			boolean done = structured.path("done").asBoolean(false);
			Map<String, Object> proposal = normalizeProposal(structured.path("proposal"), fields);
			boolean completed = done && proposal != null && !proposal.isEmpty();
			return new ProjectViews.ChatPersonalization(reply, proposal, completed);
		} catch (IOException exception) {
			throw new AppException(HttpStatus.BAD_GATEWAY, "Failed to parse OpenRouter chat response", exception);
		}
	}

	/**
	 * Tries "reply" first, then common alternative key names that LLMs sometimes use,
	 * and finally falls back to the raw assistant content.
	 */
	private String extractReplyText(JsonNode structured, String rawContent) {
		String reply = structured.path("reply").asText("").trim();
		if (!reply.isBlank()) {
			return reply;
		}
		for (String key : new String[]{"message", "text", "content", "answer", "response"}) {
			String candidate = structured.path(key).asText("").trim();
			if (!candidate.isBlank()) {
				log.debug("ChatPersonalization: reply key missing, using '{}' as fallback", key);
				return candidate;
			}
		}
		String fallback = rawContent.trim();
		return fallback.isBlank() ? "잠시 후 다시 시도해 주세요." : fallback;
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
			                        You are a highly empathetic, warm, and highly skilled Korean editor acting as a bridge between a creator and their most devoted fan.
                        Your goal is to gently guide the fan through a chat interview, eventually crafting deeply touching, personalized photobook copy.

                        Edition title: %s
                        Edition subtitle: %s
                        Creator: %s
                        Official intro: %s
                        Current saved personalization values: %s
                        Field definitions:
                        %s
                        Reference content picks (if any): %s

                        Conversation policy:
                        - Tone: 친근하고 다정하게, 마치 오랜 시간 팬의 마음을 알아주는 따뜻한 매니저나 에디터처럼 다가가세요. 딱딱한 AI 느낌을 지우고, 공감과 리액션이 듬뿍 담긴 부드러운 대화체를 사용하세요. (예: "아, 그 순간 정말 잊을 수 없죠!", "저도 그 장면에서 참 뭉클했어요.")
                        - Ask one focused question per turn. Keep it conversational, not like an interrogation.
                        - Aim to gather enough information in 2-4 questions.
                        - First turn (empty user message history): First, greet them warmly. Then ask how to address them: "가장 먼저, 이 특별한 포토북의 주인공이 될 팬님의 예쁜 이름이나 닉네임을 알려주시겠어요?"
                        - Do NOT open by asking for a companion.
                        - When asking about favoriteVideoId, ask them to recall a specific magical moment: "유독 마음이 몽글몽글해지거나 위로받았던 순간이 있다면 언제인가요?"
                        - Accept user inputs in any natural Korean form (e.g., "2022년 여름", "3년 전 비 오던 날").
                        - The generated copy must stay faithful to the interview facts. Do not invent events.
                        - When done=true, the reply should briefly say: "정말 감동적인 이야기네요. 들려주신 소중한 마음들을 모아, 세상에 하나뿐인 포토북 문구를 지금 바로 완성해 드릴게요!"

                        Copywriting policy (proposal.bookCopy):
                        - The photobook concept is: the creator speaking directly to the fan, offering a deeply personal, intimate reflection on their shared memories.
                        - Write the print-ready copy in second-person Korean (다정한 반말이나 부드러운 경어체), as if writing a secret letter to one specific fan.
                        - Favor poetic, intimate lines over generic exposition. 
                        - relationshipTitle/relationshipBody: Greeting the fan and acknowledging the time shared. (e.g., "우리가 처음 만난 그 계절")
                        - momentTitle/momentBody: Responding to their chosen scene. (e.g., "네가 그 장면에서 울었다고 했을 때, 나도 참 많이 뭉클했어.")
                        - fanNoteTitle/fanNoteBody: Turning the fan's message into a printed encouragement.

                        Output policy (MANDATORY – never violate):
                        - Your ENTIRE response must be a single valid JSON object with NO extra text before or after.
                        - Never wrap in markdown code fences.
                        - Always use exactly this shape:
                          {"reply":"<Korean message to the fan>","done":false,"proposal":null}
                          or, when you have collected enough information:
                          {"reply":"<Korean message saying the preview is being prepared now>","done":true,"proposal":{"fieldKey":"value",...,"bookCopy":{"relationshipTitle":"...","relationshipBody":"...","momentTitle":"...","momentBody":"...","fanNoteTitle":"...","fanNoteBody":"..."}}}
                        - "reply" must contain your conversational Korean message. It must NEVER be empty.
                        - "reply" must be short, natural Korean. Keep it to 1-3 sentences.
                        - "reply" must NOT contain markdown, bullet points, or internal key names.
                        - proposal keys must only be from: %s
                        - proposal may additionally contain one optional key named "bookCopy".
                        - When done=true, include bookCopy unless the information is too thin.
                        - All polished print-ready copy belongs inside proposal.bookCopy.
                        - For DATE fields, normalize any Korean/natural-language date to YYYY-MM-DD.
                        - For IMAGE_URL fields, never invent URLs.
                        - Even if the user's input is unusual, always output valid JSON.
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
		Object bookCopy = personalizationData.get("bookCopy");
		if (bookCopy instanceof Map<?, ?> map && !map.isEmpty()) {
			result.put("bookCopy", map);
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
			if ("bookCopy".equals(entry.getKey())) {
				Map<String, Object> bookCopy = normalizeBookCopy(entry.getValue());
				if (bookCopy != null && !bookCopy.isEmpty()) {
					result.put("bookCopy", bookCopy);
				}
				return;
			}

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

	private Map<String, Object> normalizeBookCopy(JsonNode bookCopyNode) {
		if (bookCopyNode == null || bookCopyNode.isMissingNode() || bookCopyNode.isNull() || !bookCopyNode.isObject()) {
			return null;
		}

		Map<String, Integer> limits = Map.of(
			"relationshipTitle", BOOK_COPY_TITLE_MAX_LENGTH,
			"relationshipBody", BOOK_COPY_BODY_MAX_LENGTH,
			"momentTitle", BOOK_COPY_TITLE_MAX_LENGTH,
			"momentBody", BOOK_COPY_BODY_MAX_LENGTH,
			"fanNoteTitle", BOOK_COPY_TITLE_MAX_LENGTH,
			"fanNoteBody", BOOK_COPY_BODY_MAX_LENGTH
		);

		Map<String, Object> result = new LinkedHashMap<>();
		for (Map.Entry<String, Integer> entry : limits.entrySet()) {
			String value = bookCopyNode.path(entry.getKey()).asText("").trim();
			if (value.isBlank()) {
				continue;
			}
			if (value.length() > entry.getValue()) {
				value = value.substring(0, entry.getValue());
			}
			result.put(entry.getKey(), value);
		}
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

	/**
	 * Attempts to parse the LLM content as a JSON object using several strategies.
	 * Returns null (instead of throwing) when all strategies fail, so the caller can
	 * gracefully fall back to treating the raw text as a plain reply.
	 */
	private JsonNode tryParseStructuredPayload(String content) {
		String trimmed = nullToEmpty(content).trim();
		if (trimmed.isBlank()) {
			return null;
		}

		try {
			JsonNode direct = readJsonObject(trimmed);
			if (direct != null) {
				return direct;
			}

			// Strip markdown code fences some models still emit despite response_format=json_object
			String unwrapped = trimmed
				.replaceFirst("^```json\\s*", "")
				.replaceFirst("^```\\s*", "")
				.replaceFirst("\\s*```$", "")
				.trim();

			JsonNode unwrappedJson = readJsonObject(unwrapped);
			if (unwrappedJson != null) {
				return unwrappedJson;
			}

			// Extract the first complete JSON object embedded in mixed text
			int firstBrace = unwrapped.indexOf('{');
			int lastBrace = unwrapped.lastIndexOf('}');
			if (firstBrace >= 0 && lastBrace > firstBrace) {
				JsonNode extracted = readJsonObject(unwrapped.substring(firstBrace, lastBrace + 1));
				if (extracted != null) {
					return extracted;
				}
			}
		} catch (Exception exception) {
			log.debug("ChatPersonalization: JSON parse attempt failed, will use plain-text fallback: {}", exception.getMessage());
		}

		return null;
	}

	private JsonNode readJsonObject(String raw) {
		try {
			JsonNode node = objectMapper.readTree(raw);
			return node != null && node.isObject() ? node : null;
		} catch (Exception exception) {
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

