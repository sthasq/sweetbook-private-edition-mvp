package com.playpick.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

	@Bean
	OpenAPI privateEditionOpenApi() {
		return new OpenAPI().info(new Info()
			.title("PlayPick Backend API")
			.version("1.0.0")
			.description("Creator-approved PlayPick backend for influencer-fan edition, personalization, printing, and order flows.")
			.contact(new Contact().name("PlayPick MVP")));
	}
}
