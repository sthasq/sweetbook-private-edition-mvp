package com.privateedition.api;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class AuthAndAccessIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void signupLoginMeAndLogoutFlowWorks() throws Exception {
		String email = uniqueEmail("member");

		MvcResult signUpResult = mockMvc.perform(post("/api/auth/signup")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "Fan12345!",
					  "displayName": "Member One"
					}
					""".formatted(email)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(email))
			.andExpect(jsonPath("$.role").value("FAN"))
			.andReturn();

		MockHttpSession session = (MockHttpSession) signUpResult.getRequest().getSession(false);

		mockMvc.perform(get("/api/auth/me").session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(email))
			.andExpect(jsonPath("$.displayName").value("Member One"));

		mockMvc.perform(post("/api/auth/logout").session(session))
			.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/auth/me").session(session))
			.andExpect(status().isUnauthorized());

		mockMvc.perform(post("/api/auth/login")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "Fan12345!"
					}
					""".formatted(email)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(email));

		mockMvc.perform(post("/api/auth/login")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "wrong-password"
					}
					""".formatted(email)))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void duplicateSignupIsRejected() throws Exception {
		String email = uniqueEmail("duplicate");

		mockMvc.perform(post("/api/auth/signup")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "Fan12345!",
					  "displayName": "Member One"
					}
					""".formatted(email)))
			.andExpect(status().isOk());

		mockMvc.perform(post("/api/auth/signup")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "Fan12345!",
					  "displayName": "Member Two"
					}
					""".formatted(email)))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.detail").value("Email is already registered"));
	}

	@Test
	void creatorCanManageStudioWhileFanCannot() throws Exception {
		MockHttpSession creatorSession = login("creator@privateedition.local", "Creator123!");
		MockHttpSession fanSession = signUp(uniqueEmail("fan-studio"), "Fan Studio");

		mockMvc.perform(post("/api/studio/editions")
				.session(fanSession)
				.contentType(APPLICATION_JSON)
				.content(studioPayload("Fan Edition")))
			.andExpect(status().isForbidden());

		MvcResult createEditionResult = mockMvc.perform(post("/api/studio/editions")
				.session(creatorSession)
				.contentType(APPLICATION_JSON)
				.content(studioPayload("Creator Edition")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.title").value("Creator Edition"))
			.andExpect(jsonPath("$.status").value("DRAFT"))
			.andReturn();

		long editionId = readLong(createEditionResult, "id");

		mockMvc.perform(patch("/api/studio/editions/{editionId}", editionId)
				.session(creatorSession)
				.contentType(APPLICATION_JSON)
				.content(studioPayload("Creator Edition Updated")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.title").value("Creator Edition Updated"));

		mockMvc.perform(post("/api/studio/editions/{editionId}/publish", editionId)
				.session(creatorSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("PUBLISHED"));
	}

	@Test
	void projectEndpointsRequireAuthentication() throws Exception {
		mockMvc.perform(post("/api/projects")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "editionId": 1,
					  "mode": "demo"
					}
					"""))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void otherFanCannotReadAnotherUsersProject() throws Exception {
		MockHttpSession ownerSession = signUp(uniqueEmail("owner"), "Owner Fan");
		MockHttpSession otherSession = signUp(uniqueEmail("other"), "Other Fan");
		long projectId = createProject(ownerSession, 1L, "demo");

		mockMvc.perform(get("/api/projects/{projectId}/preview", projectId).session(otherSession))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.detail").value("You do not have access to this project"));
	}

	@Test
	void myProjectsReturnsOnlyOwnedProjects() throws Exception {
		MockHttpSession ownerSession = signUp(uniqueEmail("owner-list"), "List Owner");
		MockHttpSession otherSession = signUp(uniqueEmail("other-list"), "Other Owner");

		long ownerProjectId = createProject(ownerSession, 1L, "youtube");
		createProject(otherSession, 1L, "demo");

		mockMvc.perform(get("/api/me/projects").session(ownerSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].projectId").value(ownerProjectId))
			.andExpect(jsonPath("$[0].mode").value("youtube"));
	}

	private MockHttpSession login(String email, String password) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/auth/login")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "%s"
					}
					""".formatted(email, password)))
			.andExpect(status().isOk())
			.andReturn();

		return (MockHttpSession) result.getRequest().getSession(false);
	}

	private MockHttpSession signUp(String email, String displayName) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/auth/signup")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "Fan12345!",
					  "displayName": "%s"
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

	private String studioPayload(String title) {
		return """
			{
			  "title": "%s",
			  "subtitle": "Official creator drop",
			  "coverImageUrl": "https://picsum.photos/seed/studio-auth/600/600",
			  "bookSpecUid": "SQUAREBOOK_HC",
			  "officialIntro": {
			    "heading": "Welcome",
			    "body": "Creator intro"
			  },
			  "officialClosing": {
			    "heading": "Goodbye",
			    "body": "Creator closing"
			  },
			  "curatedAssets": [
			    {
			      "assetType": "IMAGE",
			      "title": "Main Visual",
			      "content": "https://picsum.photos/seed/studio-main/1200/900",
			      "sortOrder": 1
			    }
			  ],
			  "personalizationFields": [
			    {
			      "fieldKey": "fanNickname",
			      "label": "닉네임",
			      "inputType": "text",
			      "required": true,
			      "maxLength": 30,
			      "sortOrder": 1
			    }
			  ]
			}
			""".formatted(title);
	}

	private long readLong(MvcResult result, String key) throws Exception {
		return Long.parseLong(readString(result, key));
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
		return prefix + "-" + UUID.randomUUID() + "@privateedition.local";
	}
}
