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

	private String chatModel = "deepseek/deepseek-v3.2";

	private String imageModel = "google/gemini-3.1-flash-image-preview";

	public boolean isReady() {
		return isImageReady();
	}

	public boolean isImageReady() {
		return !apiKey.isBlank() && !imageModel.isBlank();
	}

	public boolean isChatReady() {
		return !apiKey.isBlank() && !chatModel.isBlank();
	}
}
