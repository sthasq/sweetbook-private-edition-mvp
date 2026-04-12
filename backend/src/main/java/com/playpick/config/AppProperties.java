package com.playpick.config;

import java.net.URI;
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

	public String resolvePublicUrl(String rawValue) {
		if (rawValue == null || rawValue.isBlank()) {
			return rawValue;
		}

		String trimmed = rawValue.trim();
		try {
			URI uri = URI.create(trimmed);
			if (uri.isAbsolute()) {
				return uri.toString();
			}
		} catch (IllegalArgumentException exception) {
			return rawValue;
		}

		try {
			URI publicBaseUri = URI.create(getEffectivePublicBaseUrl());
			if (isAppRelativeAssetPath(trimmed)) {
				return buildAppRelativeUrl(publicBaseUri, trimmed);
			}
			return publicBaseUri.resolve(trimmed.startsWith("/") ? trimmed : "/" + trimmed).toString();
		} catch (IllegalArgumentException exception) {
			return rawValue;
		}
	}

	private boolean isAppRelativeAssetPath(String rawValue) {
		return rawValue.startsWith("/demo-assets/")
			|| rawValue.startsWith("demo-assets/")
			|| rawValue.startsWith("/api/assets/")
			|| rawValue.startsWith("api/assets/");
	}

	private String buildAppRelativeUrl(URI publicBaseUri, String rawValue) {
		String relativePath = rawValue.startsWith("/") ? rawValue.substring(1) : rawValue;
		String basePath = normalizeBasePath(publicBaseUri.getPath());
		String prefix = publicBaseUri.getScheme() + "://" + publicBaseUri.getAuthority();
		String resolvedPath = basePath.isBlank()
			? "/" + relativePath
			: basePath + "/" + relativePath;
		return prefix + resolvedPath;
	}

	private String normalizeBasePath(String rawPath) {
		if (rawPath == null || rawPath.isBlank() || "/".equals(rawPath)) {
			return "";
		}
		String trimmed = rawPath.endsWith("/") ? rawPath.substring(0, rawPath.length() - 1) : rawPath;
		return trimmed.startsWith("/") ? trimmed : "/" + trimmed;
	}
}
