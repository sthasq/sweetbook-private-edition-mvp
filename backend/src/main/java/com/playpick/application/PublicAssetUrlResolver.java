package com.playpick.application;

import com.playpick.config.AppProperties;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PublicAssetUrlResolver {

	private final AppProperties appProperties;

	public String resolve(String rawValue) {
		if (rawValue == null || rawValue.isBlank()) {
			return rawValue;
		}

		URI uri;
		try {
			uri = URI.create(rawValue.trim());
		} catch (IllegalArgumentException exception) {
			return rawValue;
		}

		if (uri.isAbsolute()) {
			return uri.toString();
		}

		try {
			URI publicBaseUri = URI.create(appProperties.getEffectivePublicBaseUrl());
			return publicBaseUri.resolve(rawValue.startsWith("/") ? rawValue : "/" + rawValue).toString();
		} catch (IllegalArgumentException exception) {
			return rawValue;
		}
	}
}
