package com.playpick.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "toss-payments")
public class TossPaymentsProperties {

	private String baseUrl = "https://api.tosspayments.com";

	private String clientKey = "";

	private String secretKey = "";

	private boolean enabled;

	public boolean isReady() {
		return enabled && !clientKey.isBlank() && !secretKey.isBlank();
	}
}
