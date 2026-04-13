package com.playpick.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "openrouter")
public class OpenRouterProperties {

	private String baseUrl = "https://openrouter.ai/api/v1";

	private String apiKey = "";

	private String chatModel = "google/gemini-3-flash-preview";

	public boolean isChatReady() {
		return !apiKey.isBlank() && !chatModel.isBlank();
	}
}
