package com.playpick.application;

import com.playpick.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PublicAssetUrlResolver {

	private final AppProperties appProperties;

	public String resolve(String rawValue) {
		return appProperties.resolvePublicUrl(rawValue);
	}
}
