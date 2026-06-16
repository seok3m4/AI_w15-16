package com.memento.feature.auth;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AuthCurrentUserService {

    private final AuthUserRepository userRepository;
    private final EmailUnprotector emailUnprotector;

    AuthCurrentUserService(AuthUserRepository userRepository, EmailUnprotector emailUnprotector) {
        this.userRepository = userRepository;
        this.emailUnprotector = emailUnprotector;
    }

    @Transactional(readOnly = true)
    UserPrivateResponse me(UUID userId) {
        UserPrivateRecord user = userRepository.findActivePrivateUserById(userId)
                .orElseThrow(InvalidAccessTokenException::new);
        return new UserPrivateResponse(
                user.id(),
                emailUnprotector.unprotect(user.emailCiphertext(), user.emailNonce()),
                user.nickname(),
                user.friendAiSharingEnabled(),
                user.createdAt());
    }
}
