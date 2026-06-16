package com.junglecamp.backend.user;

import static org.assertj.core.api.Assertions.assertThat;

import com.junglecamp.backend.user.repository.AppUserRepository;
import org.junit.jupiter.api.Test;

class AppUserRepositoryTests {

	@Test
	void defaultUserListFilterDoesNotBindNullSentinelParameters() {
		AppUserRepository.UserListFilter filter = AppUserRepository.userListFilter(null, null, null);

		assertThat(filter.whereClause()).isEmpty();
		assertThat(filter.parameters()).isEmpty();
	}

	@Test
	void userListFilterAddsOnlyRequestedPredicates() {
		AppUserRepository.UserListFilter filter = AppUserRepository.userListFilter("Admin", "ROLE_ADMIN", "active");

		assertThat(filter.whereClause())
				.contains("LOWER(COALESCE(email, '')) LIKE ?")
				.contains("roles LIKE ?")
				.contains("suspended_at IS NULL")
				.doesNotContain("? IS NULL");
		assertThat(filter.parameters())
				.containsExactly("%admin%", "%admin%", "%admin%", "%ROLE_ADMIN%");
	}
}
