package com.junglecamp.backend.user.dto;
import java.util.List;

public final class UserDtos {

	private UserDtos() {
	}

	public record CurrentUser(
			Long id,
			String username,
			String email,
			String displayName,
			String avatarUrl,
			String provider,
			String nickname,
			String displayNickname,
			List<String> roles,
			boolean emailVerified,
			boolean suspended,
			boolean adminMfaRequired,
			boolean adminMfaVerified,
			boolean adminMfaEnrolled) {
	}

	public record ProfileRequest(String nickname) {
	}

	public record NicknameAvailability(String nickname, boolean valid, boolean available, String message) {
	}
}
