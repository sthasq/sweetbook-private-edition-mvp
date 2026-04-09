package com.privateedition.application;

import com.privateedition.domain.AppUser;
import com.privateedition.domain.AppUserRepository;
import com.privateedition.domain.AppUserRole;
import com.privateedition.domain.CreatorProfile;
import com.privateedition.domain.CreatorProfileRepository;
import com.privateedition.security.AuthenticatedUser;
import com.privateedition.security.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

	private final AppUserRepository appUserRepository;
	private final CreatorProfileRepository creatorProfileRepository;
	private final PasswordEncoder passwordEncoder;
	private final SecurityContextRepository securityContextRepository;
	private final CurrentUserService currentUserService;

	@Transactional
	public AuthViews.CurrentUser signUp(AuthCommands.SignUp command, HttpServletRequest request, HttpServletResponse response) {
		String normalizedEmail = normalizeEmail(command.email());
		if (appUserRepository.findByEmail(normalizedEmail).isPresent()) {
			throw new AppException(HttpStatus.CONFLICT, "Email is already registered");
		}
		AppUserRole role = command.role() == null ? AppUserRole.FAN : command.role();

		AppUser user = new AppUser();
		user.setEmail(normalizedEmail);
		user.setPasswordHash(passwordEncoder.encode(command.password()));
		user.setDisplayName(command.displayName().trim());
		user.setRole(role);
		user = appUserRepository.save(user);
		createCreatorProfileIfNeeded(user, command);

		authenticate(user, request, response);
		return toView(user);
	}

	public AuthViews.CurrentUser login(AuthCommands.Login command, HttpServletRequest request, HttpServletResponse response) {
		String normalizedEmail = normalizeEmail(command.email());
		AppUser user = appUserRepository.findByEmail(normalizedEmail)
			.orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

		if (!passwordEncoder.matches(command.password(), user.getPasswordHash())) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
		}

		authenticate(user, request, response);
		return toView(user);
	}

	public AuthViews.CurrentUser currentUser() {
		return toView(currentUserService.requireCurrentAppUser());
	}

	public void logout(HttpServletRequest request, HttpServletResponse response) {
		new SecurityContextLogoutHandler().logout(request, response, SecurityContextHolder.getContext().getAuthentication());
	}

	private void authenticate(AppUser user, HttpServletRequest request, HttpServletResponse response) {
		HttpSession existingSession = request.getSession(false);
		if (existingSession != null) {
			existingSession.invalidate();
		}

		AuthenticatedUser principal = new AuthenticatedUser(
			user.getId(),
			user.getEmail(),
			user.getDisplayName(),
			user.getRole()
		);

		UsernamePasswordAuthenticationToken authentication = UsernamePasswordAuthenticationToken.authenticated(
			principal,
			null,
			java.util.List.of(new SimpleGrantedAuthority(user.getRole().authority()))
		);
		SecurityContext context = new SecurityContextImpl(authentication);
		SecurityContextHolder.setContext(context);
		request.getSession(true);
		securityContextRepository.saveContext(context, request, response);
	}

	private AuthViews.CurrentUser toView(AppUser user) {
		return new AuthViews.CurrentUser(
			user.getId(),
			user.getEmail(),
			user.getDisplayName(),
			user.getRole().name()
		);
	}

	private String normalizeEmail(String email) {
		return email == null ? "" : email.trim().toLowerCase();
	}

	private void createCreatorProfileIfNeeded(AppUser user, AuthCommands.SignUp command) {
		if (user.getRole() != AppUserRole.CREATOR) {
			return;
		}

		String channelHandle = normalizeChannelHandle(command.channelHandle());
		if (channelHandle.isBlank()) {
			throw new AppException(HttpStatus.BAD_REQUEST, "Creator channel handle is required");
		}

		CreatorProfile creatorProfile = new CreatorProfile();
		creatorProfile.setUser(user);
		creatorProfile.setDisplayName(user.getDisplayName());
		creatorProfile.setChannelHandle(channelHandle);
		creatorProfile.setAvatarUrl(buildDefaultAvatarUrl(channelHandle));
		creatorProfile.setVerified(false);
		creatorProfileRepository.save(creatorProfile);
	}

	private String normalizeChannelHandle(String channelHandle) {
		if (channelHandle == null) {
			return "";
		}
		String normalized = channelHandle.trim();
		while (normalized.startsWith("@")) {
			normalized = normalized.substring(1).trim();
		}
		return normalized;
	}

	private String buildDefaultAvatarUrl(String channelHandle) {
		return "https://picsum.photos/seed/creator-" + channelHandle.replaceAll("[^a-zA-Z0-9_-]", "-") + "/400/400";
	}
}
