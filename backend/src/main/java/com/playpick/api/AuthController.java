package com.playpick.api;

import com.playpick.application.AuthCommands;
import com.playpick.application.AuthService;
import com.playpick.application.AuthViews;
import com.playpick.domain.AppUserRole;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Auth")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

	private final AuthService authService;

	@Operation(summary = "Register a new account")
	@PostMapping("/signup")
	public AuthViews.CurrentUser signUp(
		@Valid @RequestBody SignUpRequest request,
		HttpServletRequest servletRequest,
		HttpServletResponse servletResponse
	) {
		return authService.signUp(request.toCommand(), servletRequest, servletResponse);
	}

	@Operation(summary = "Log in with email and password")
	@PostMapping("/login")
	public AuthViews.CurrentUser login(
		@Valid @RequestBody LoginRequest request,
		HttpServletRequest servletRequest,
		HttpServletResponse servletResponse
	) {
		return authService.login(request.toCommand(), servletRequest, servletResponse);
	}

	@Operation(summary = "Get the current authenticated user")
	@GetMapping("/me")
	public AuthViews.CurrentUser me() {
		return authService.currentUser();
	}

	@Operation(summary = "Get the current session user if signed in")
	@GetMapping("/session")
	public AuthViews.CurrentUser session() {
		return authService.sessionUser();
	}

	@Operation(summary = "Issue a CSRF token for browser clients")
	@GetMapping("/csrf")
	public CsrfTokenResponse csrf(CsrfToken csrfToken) {
		return new CsrfTokenResponse(
			csrfToken.getHeaderName(),
			csrfToken.getParameterName(),
			csrfToken.getToken()
		);
	}

	@Operation(summary = "Log out the current session")
	@PostMapping("/logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void logout(HttpServletRequest request, HttpServletResponse response) {
		authService.logout(request, response);
	}
}

record SignUpRequest(
	@NotBlank @Email @Size(max = 255) String email,
	@NotBlank @Size(min = 8, max = 100) String password,
	@NotBlank @Size(max = 100) String displayName,
	@NotNull AppUserRole role,
	@Size(max = 100) String channelHandle
) {
	AuthCommands.SignUp toCommand() {
		return new AuthCommands.SignUp(email, password, displayName, role, channelHandle);
	}
}

record LoginRequest(
	@NotBlank @Email @Size(max = 255) String email,
	@NotBlank @Size(min = 8, max = 100) String password
) {
	AuthCommands.Login toCommand() {
		return new AuthCommands.Login(email, password);
	}
}

record CsrfTokenResponse(
	String headerName,
	String parameterName,
	String token
) {
}
