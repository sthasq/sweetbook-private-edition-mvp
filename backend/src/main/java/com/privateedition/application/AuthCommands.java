package com.privateedition.application;

import com.privateedition.domain.AppUserRole;

public final class AuthCommands {

	private AuthCommands() {
	}

	public record SignUp(
		String email,
		String password,
		String displayName,
		AppUserRole role,
		String channelHandle
	) {
	}

	public record Login(
		String email,
		String password
	) {
	}
}
