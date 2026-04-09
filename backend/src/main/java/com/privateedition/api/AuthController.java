package com.privateedition.api;

import com.privateedition.application.AuthCommands;
import com.privateedition.application.AuthService;
import com.privateedition.application.AuthViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

	@Operation(summary = "Register a new fan account")
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
	@NotBlank @Size(max = 100) String displayName
) {
	AuthCommands.SignUp toCommand() {
		return new AuthCommands.SignUp(email, password, displayName);
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
