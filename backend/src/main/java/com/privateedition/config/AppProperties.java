package com.privateedition.config;

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
		"http://localhost:5173"
	));

	private String frontendBaseUrl = "http://localhost:3000";

	private String demoImageBaseUrl = "https://picsum.photos";
}
