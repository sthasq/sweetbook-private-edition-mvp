package com.playpick.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "google")
public class GoogleProperties {

	private String clientId = "";

	private String clientSecret = "";

	private String redirectUri = "http://localhost:3000/oauth/google/callback";

	private String apiKey = "";

	public boolean isConfigured() {
		return !clientId.isBlank() && !clientSecret.isBlank();
	}

	public boolean hasApiKey() {
		return !apiKey.isBlank();
	}
}
