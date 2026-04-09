package com.privateedition.application;

public final class AuthCommands {

	private AuthCommands() {
	}

	public record SignUp(
		String email,
		String password,
		String displayName
	) {
	}

	public record Login(
		String email,
		String password
	) {
	}
}
