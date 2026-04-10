package com.playpick.api;

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
					  "displayName": "Member One",
					  "role": "FAN"
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
					  "displayName": "Member One",
					  "role": "FAN"
					}
					""".formatted(email)))
			.andExpect(status().isOk());

		mockMvc.perform(post("/api/auth/signup")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "Fan12345!",
					  "displayName": "Member Two",
					  "role": "FAN"
					}
					""".formatted(email)))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.detail").value("Email is already registered"));
	}

	@Test
	void creatorCanManageStudioWhileFanCannot() throws Exception {
		MockHttpSession creatorSession = signUpCreator(uniqueEmail("creator-studio"), "Studio Creator", "@studio_creator");
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

		long fanProjectId = createProject(fanSession, editionId, "demo");

		mockMvc.perform(get("/api/projects/{projectId}/preview", fanProjectId).session(fanSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.edition.id").value(editionId))
			.andExpect(jsonPath("$.pages[1].title").value("어서 와요"))
			.andExpect(jsonPath("$.pages[1].description").value("크리에이터 인사"))
			.andExpect(jsonPath("$.pages[6].title").value("다음에도 만나요"))
			.andExpect(jsonPath("$.pages[6].description").value("마지막 한마디"));
	}

	@Test
	void creatorSignupCreatesStudioReadyAccount() throws Exception {
		String email = uniqueEmail("creator");

		MvcResult signUpResult = mockMvc.perform(post("/api/auth/signup")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "Creator123!",
					  "displayName": "Fresh Creator",
					  "role": "CREATOR",
					  "channelHandle": "@fresh_creator"
					}
					""".formatted(email)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(email))
			.andExpect(jsonPath("$.role").value("CREATOR"))
			.andReturn();

		MockHttpSession creatorSession = (MockHttpSession) signUpResult.getRequest().getSession(false);

		mockMvc.perform(post("/api/studio/editions")
				.session(creatorSession)
				.contentType(APPLICATION_JSON)
				.content(studioPayload("Fresh Creator Edition")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.creator.displayName").value("Fresh Creator"))
			.andExpect(jsonPath("$.creator.channelHandle").value("fresh_creator"))
			.andExpect(jsonPath("$.creator.verified").value(false));
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

	@Test
	void orderedProjectResumesAtCompleteAndReturnsOrderSummary() throws Exception {
		MockHttpSession session = signUp(uniqueEmail("ordered"), "Ordered Fan");
		long projectId = createProject(session, 1L, "demo");

		mockMvc.perform(post("/api/projects/{projectId}/generate-book", projectId).session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("FINALIZED"));

		mockMvc.perform(post("/api/projects/{projectId}/order", projectId)
				.session(session)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "recipientName": "천경신",
					  "recipientPhone": "010-1234-5678",
					  "postalCode": "06236",
					  "address1": "서울특별시 강남구 테헤란로 123",
					  "address2": "10층",
					  "quantity": 1
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.siteOrderUid").isNotEmpty())
			.andExpect(jsonPath("$.siteOrderStatus").value("PAID"))
			.andExpect(jsonPath("$.fulfillmentStatus").isNotEmpty());

		mockMvc.perform(get("/api/me/projects").session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].projectId").value(projectId))
			.andExpect(jsonPath("$[0].status").value("ORDERED"))
			.andExpect(jsonPath("$[0].continuePath").value("/projects/" + projectId + "/complete"));

		mockMvc.perform(get("/api/projects/{projectId}/order-summary", projectId).session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.projectId").value(projectId))
			.andExpect(jsonPath("$.projectStatus").value("ORDERED"))
			.andExpect(jsonPath("$.siteOrderUid").isNotEmpty())
			.andExpect(jsonPath("$.siteOrderStatus").value("PAID"))
			.andExpect(jsonPath("$.fulfillmentStatus").isNotEmpty())
			.andExpect(jsonPath("$.edition.title").value("빠니보틀 세계여행 메모리북 데모"))
			.andExpect(jsonPath("$.shipping.recipientName").value("천경신"));
	}

	@Test
	void creatorCanViewOnlyOwnedEditionOrdersInStudioDashboard() throws Exception {
		MockHttpSession creatorSession = signUpCreator(uniqueEmail("creator-orders"), "Order Creator", "@order_creator");
		MockHttpSession otherCreatorSession = signUpCreator(uniqueEmail("other-creator-orders"), "Other Creator", "@other_creator");
		MockHttpSession fanSession = signUp(uniqueEmail("fan-orders"), "주문 팬");
		MockHttpSession otherFanSession = signUp(uniqueEmail("other-fan-orders"), "다른 팬");

		long creatorEditionId = createAndPublishEdition(creatorSession, "Order Creator Edition");
		long otherCreatorEditionId = createAndPublishEdition(otherCreatorSession, "Other Creator Edition");

		long creatorProjectId = createProject(fanSession, creatorEditionId, "demo");
		long otherCreatorProjectId = createProject(otherFanSession, otherCreatorEditionId, "demo");

		placeOrder(fanSession, creatorProjectId, "주문 팬", "010-1234-5678");
		placeOrder(otherFanSession, otherCreatorProjectId, "다른 팬", "010-2222-3333");

		mockMvc.perform(get("/api/studio/orders").session(creatorSession))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalOrders").value(1))
			.andExpect(jsonPath("$.paidOrders").value(1))
			.andExpect(jsonPath("$.recentOrders[0].projectId").value(creatorProjectId))
			.andExpect(jsonPath("$.recentOrders[0].editionId").value(creatorEditionId))
			.andExpect(jsonPath("$.recentOrders[0].editionTitle").value("Order Creator Edition"))
			.andExpect(jsonPath("$.recentOrders[0].fanDisplayName").value("주문 팬"))
			.andExpect(jsonPath("$.recentOrders[0].recipientName").value("주문 팬"))
			.andExpect(jsonPath("$.recentOrders[0].recipientPhoneMasked").value("010-****-5678"))
			.andExpect(jsonPath("$.recentOrders[0].siteOrderStatus").value("PAID"));

		mockMvc.perform(get("/api/studio/orders").session(fanSession))
			.andExpect(status().isForbidden());
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
					  "displayName": "%s",
					  "role": "FAN"
					}
					""".formatted(email, displayName)))
			.andExpect(status().isOk())
			.andReturn();

		return (MockHttpSession) result.getRequest().getSession(false);
	}

	private MockHttpSession signUpCreator(String email, String displayName, String channelHandle) throws Exception {
		MvcResult result = mockMvc.perform(post("/api/auth/signup")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "email": "%s",
					  "password": "Creator123!",
					  "displayName": "%s",
					  "role": "CREATOR",
					  "channelHandle": "%s"
					}
					""".formatted(email, displayName, channelHandle)))
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

	private long createAndPublishEdition(MockHttpSession session, String title) throws Exception {
		MvcResult createEditionResult = mockMvc.perform(post("/api/studio/editions")
				.session(session)
				.contentType(APPLICATION_JSON)
				.content(studioPayload(title)))
			.andExpect(status().isOk())
			.andReturn();

		long editionId = readLong(createEditionResult, "id");

		mockMvc.perform(post("/api/studio/editions/{editionId}/publish", editionId)
				.session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("PUBLISHED"));

		return editionId;
	}

	private void placeOrder(MockHttpSession session, long projectId, String recipientName, String recipientPhone) throws Exception {
		mockMvc.perform(post("/api/projects/{projectId}/generate-book", projectId).session(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("FINALIZED"));

		mockMvc.perform(post("/api/projects/{projectId}/order", projectId)
				.session(session)
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "recipientName": "%s",
					  "recipientPhone": "%s",
					  "postalCode": "06236",
					  "address1": "서울특별시 강남구 테헤란로 123",
					  "address2": "10층",
					  "quantity": 1
					}
					""".formatted(recipientName, recipientPhone)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.siteOrderStatus").value("PAID"));
	}

	private String studioPayload(String title) {
		return """
			{
			  "title": "%s",
			  "subtitle": "지금 공개 중인 드롭",
			  "coverImageUrl": "https://picsum.photos/seed/studio-auth/600/600",
			  "bookSpecUid": "SQUAREBOOK_HC",
			  "officialIntro": {
			    "heading": "어서 와요",
			    "body": "크리에이터 인사"
			  },
			  "officialClosing": {
			    "heading": "다음에도 만나요",
			    "body": "마지막 한마디"
			  },
			  "curatedAssets": [
			    {
			      "assetType": "IMAGE",
			      "title": "메인 이미지",
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
		return prefix + "-" + UUID.randomUUID() + "@playpick.local";
	}
}
