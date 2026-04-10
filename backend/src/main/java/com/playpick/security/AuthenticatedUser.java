package com.playpick.security;

import com.playpick.domain.AppUserRole;
import java.io.Serial;
import java.io.Serializable;

public record AuthenticatedUser(
	Long id,
	String email,
	String displayName,
	AppUserRole role
) implements Serializable {

	@Serial
	private static final long serialVersionUID = 1L;
}
