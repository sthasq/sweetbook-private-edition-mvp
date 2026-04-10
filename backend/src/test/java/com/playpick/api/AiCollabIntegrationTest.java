package com.playpick.api;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = "openrouter.api-key=")
@AutoConfigureMockMvc
@ActiveProfiles("local")
class AiCollabIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void aiCollabEndpointRequiresOwnershipAndConfiguredOpenRouter() throws Exception {
		MockHttpSession ownerSession = signUp(uniqueEmail("owner-collab"), "콜라보 주인");
		MockHttpSession otherSession = signUp(uniqueEmail("other-collab"), "다른 팬");
		long projectId = createProject(ownerSession, 1L, "demo");
		String sampleImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2lm7kAAAAASUVORK5CYII=";

		mockMvc.perform(post("/api/projects/{projectId}/ai-collab/generate", projectId)
				.session(otherSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "templateKey": "travel-selfie",
					  "sourceImageUrl": "%s",
					  "officialImageUrl": "%s"
					}
					""".formatted(sampleImage, sampleImage)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.detail").value("You do not have access to this project"));

		mockMvc.perform(post("/api/projects/{projectId}/ai-collab/generate", projectId)
				.session(ownerSession)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "templateKey": "travel-selfie",
					  "sourceImageUrl": "%s",
					  "officialImageUrl": "%s"
					}
					""".formatted(sampleImage, sampleImage)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("OpenRouter is not configured"));
	}

	private MockHttpSession signUp(String email, String displayName) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/auth/signup")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "Fan12345!",
					  "displayName": "%s",
					  "role": "FAN"
					}
					""".formatted(email, displayName)))
			.andExpect(status().isOk())
			.andReturn();

		return (MockHttpSession) result.getRequest().getSession(false);
	}

	private long createProject(MockHttpSession session, long editionId, String mode) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/projects")
				.session(session)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "editionId": %d,
					  "mode": "%s"
					}
					""".formatted(editionId, mode)))
			.andExpect(status().isOk())
			.andReturn();

		return Long.parseLong(readString(result, "projectId"));
	}

	private String readString(MvcResult result, String key) throws Exception {
		Map<String, Object> payload = objectMapper.readValue(
			result.getResponse().getContentAsString(),
			new TypeReference<>() {
			}
		);
		Object value = payload.get(key);
		return value == null ? null : String.valueOf(value);
	}

	private String uniqueEmail(String prefix) {
		return prefix + "-" + UUID.randomUUID() + "@playpick.local";
	}
}
