package com.playpick.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "sweetbook")
public class SweetbookProperties {

	private String baseUrl = "https://api-sandbox.sweetbook.com/v1";

	private String apiKey = "";

	private boolean enabled;

	private String defaultBookSpecUid = "SQUAREBOOK_HC";

	private String defaultTemplateCategory = "album";

	private String defaultCoverTemplateUid = "";

	private String defaultPublishTemplateUid = "";

	private String defaultContentTemplateUid = "";

	private String webhookSecret = "";

	public boolean isLiveEnabled() {
		return enabled && !apiKey.isBlank();
	}

	public boolean isWebhookSecretConfigured() {
		return webhookSecret != null && !webhookSecret.isBlank();
	}

	public String integrationMode() {
		if (!isLiveEnabled()) {
			return "SIMULATED";
		}
		return baseUrl != null && baseUrl.toLowerCase().contains("sandbox") ? "SANDBOX" : "LIVE";
	}
}
