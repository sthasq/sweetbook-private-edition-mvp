package com.playpick.domain;

public enum AppUserRole {
	FAN,
	CREATOR,
	ADMIN;

	public String authority() {
		return "ROLE_" + name();
	}
}
