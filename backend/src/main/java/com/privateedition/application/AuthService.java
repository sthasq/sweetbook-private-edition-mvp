package com.privateedition.application;

import com.privateedition.domain.AppUser;
import com.privateedition.domain.AppUserRepository;
import com.privateedition.domain.AppUserRole;
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
	private final PasswordEncoder passwordEncoder;
	private final SecurityContextRepository securityContextRepository;
	private final CurrentUserService currentUserService;

	@Transactional
	public AuthViews.CurrentUser signUp(AuthCommands.SignUp command, HttpServletRequest request, HttpServletResponse response) {
		String normalizedEmail = normalizeEmail(command.email());
		if (appUserRepository.findByEmail(normalizedEmail).isPresent()) {
			throw new AppException(HttpStatus.CONFLICT, "Email is already registered");
		}

		AppUser user = new AppUser();
		user.setEmail(normalizedEmail);
		user.setPasswordHash(passwordEncoder.encode(command.password()));
		user.setDisplayName(command.displayName().trim());
		user.setRole(AppUserRole.FAN);
		user = appUserRepository.save(user);

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
}
