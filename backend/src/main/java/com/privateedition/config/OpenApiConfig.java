package com.privateedition.config;

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
			.title("Private Edition Backend API")
			.version("1.0.0")
			.description("Creator-approved Private Edition MVP backend for Sweetbook Book Print and YouTube recap flows.")
			.contact(new Contact().name("Private Edition MVP")));
	}
}
