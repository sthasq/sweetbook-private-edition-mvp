package com.privateedition.application;

public final class AuthViews {

	private AuthViews() {
	}

	public record CurrentUser(
		Long id,
		String email,
		String displayName,
		String role
	) {
	}
}
