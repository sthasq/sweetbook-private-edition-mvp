package com.playpick.domain;

public enum AppUserRole {
	FAN,
	CREATOR;

	public String authority() {
		return "ROLE_" + name();
	}
}
