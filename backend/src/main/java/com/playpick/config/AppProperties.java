package com.playpick.config;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app")
public class AppProperties {

	private List<String> corsAllowedOrigins = new ArrayList<>(List.of(
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"http://localhost:5173",
		"http://127.0.0.1:5173"
	));

	private String frontendBaseUrl = "http://localhost:3000";

	private String demoImageBaseUrl = "https://picsum.photos";

	private String studioAssetDir = System.getProperty("java.io.tmpdir") + "/playpick-studio-assets";

	private String demoAssetDir = "../frontend/public/demo-assets";

	private String publicBaseUrl = "";

	private String publicAssetBaseUrl = "";

	private String publicAssetScpTarget = "";

	private String publicAssetSshKeyPath = "";

	private BigDecimal commissionRate = new BigDecimal("0.20");

	private BigDecimal marginRate = new BigDecimal("0.35");

	public String getEffectivePublicBaseUrl() {
		return publicBaseUrl == null || publicBaseUrl.isBlank() ? frontendBaseUrl : publicBaseUrl;
	}
}
