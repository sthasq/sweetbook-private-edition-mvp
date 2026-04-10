package com.playpick.security;

import com.playpick.application.AppException;
import com.playpick.domain.AppUser;
import com.playpick.domain.AppUserRepository;
import com.playpick.domain.AppUserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

	private final AppUserRepository appUserRepository;

	public AuthenticatedUser requireAuthenticatedUser() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "Authentication required");
		}

		Object principal = authentication.getPrincipal();
		if (principal instanceof AuthenticatedUser user) {
			return user;
		}

		throw new AppException(HttpStatus.UNAUTHORIZED, "Authentication required");
	}

	public AppUser requireCurrentAppUser() {
		AuthenticatedUser user = requireAuthenticatedUser();
		return appUserRepository.findById(user.id())
			.orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
	}

	public AppUser requireCurrentAppUser(AppUserRole role) {
		AuthenticatedUser currentUser = requireAuthenticatedUser();
		if (currentUser.role() != role) {
			throw new AppException(HttpStatus.FORBIDDEN, "You do not have access to this resource");
		}
		return appUserRepository.findById(currentUser.id())
			.orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
	}
}
