package com.junglecamp.backend.user.model;

import java.time.Instant;
import java.util.List;

public record AppUser(
		Long id,
		String provider,
		String providerUserId,
		String email,
		String displayName,
		String avatarUrl,
		String nickname,
		Instant emailVerifiedAt,
		List<String> roles,
		Instant suspendedAt) {

	public boolean emailVerified() {
		return emailVerifiedAt != null;
	}

	public boolean suspended() {
		return suspendedAt != null;
	}
}
