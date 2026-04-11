package com.playpick.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.InvalidCsrfTokenException;
import org.springframework.security.web.csrf.MissingCsrfTokenException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

@Configuration
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(
		HttpSecurity http,
		ObjectMapper objectMapper,
		CookieCsrfTokenRepository csrfTokenRepository
	) throws Exception {
		http
			.csrf(csrf -> csrf
				.csrfTokenRepository(csrfTokenRepository)
				.ignoringRequestMatchers("/api/sweetbook/webhooks/**", "/h2-console/**")
			)
			.httpBasic(AbstractHttpConfigurer::disable)
			.formLogin(AbstractHttpConfigurer::disable)
			.logout(AbstractHttpConfigurer::disable)
			.headers(headers -> headers.frameOptions(frameOptions -> frameOptions.sameOrigin()))
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
			.securityContext(context -> context.securityContextRepository(securityContextRepository()))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers(
					"/swagger-ui/**",
					"/swagger-ui.html",
					"/v3/api-docs/**",
					"/h2-console/**"
				).permitAll()
				.requestMatchers("/api/auth/csrf").permitAll()
				.requestMatchers("/api/auth/signup", "/api/auth/login", "/api/auth/logout").permitAll()
				.requestMatchers("/api/assets/**").permitAll()
				.requestMatchers("/api/editions/**").permitAll()
				.requestMatchers("/api/admin/**").hasRole("ADMIN")
				.requestMatchers("/api/studio/**").hasRole("CREATOR")
				.requestMatchers("/api/projects/**", "/api/me/**", "/api/auth/me").authenticated()
				.anyRequest().permitAll()
			)
			.exceptionHandling(exceptions -> exceptions
				.authenticationEntryPoint((request, response, exception) ->
					writeProblemDetail(response, objectMapper, HttpStatus.UNAUTHORIZED, "Authentication required"))
				.accessDeniedHandler((request, response, exception) -> {
					String detail = isCsrfFailure(exception)
						? "CSRF token is missing or invalid"
						: "Access denied";
					writeProblemDetail(response, objectMapper, HttpStatus.FORBIDDEN, detail);
				})
			);

		return http.build();
	}

	@Bean
	CookieCsrfTokenRepository csrfTokenRepository() {
		CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
		repository.setCookiePath("/");
		return repository;
	}

	@Bean
	SecurityContextRepository securityContextRepository() {
		return new HttpSessionSecurityContextRepository();
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	private boolean isCsrfFailure(AccessDeniedException exception) {
		return exception instanceof MissingCsrfTokenException || exception instanceof InvalidCsrfTokenException;
	}

	private void writeProblemDetail(
		jakarta.servlet.http.HttpServletResponse response,
		ObjectMapper objectMapper,
		HttpStatus status,
		String detail
	) throws java.io.IOException {
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		objectMapper.writeValue(response.getOutputStream(), Map.of(
			"type", "about:blank",
			"title", status.getReasonPhrase(),
			"status", status.value(),
			"detail", detail,
			"timestamp", Instant.now()
		));
	}
}
