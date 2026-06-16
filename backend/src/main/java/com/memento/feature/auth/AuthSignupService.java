package com.memento.feature.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthSignupService {

    private final AuthUserRepository userRepository;
    private final PasswordHasher passwordHasher;
    private final EmailProtector emailProtector;
    private final Clock clock;

    AuthSignupService(
            AuthUserRepository userRepository,
            PasswordHasher passwordHasher,
            EmailProtector emailProtector,
            Clock clock) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
        this.emailProtector = emailProtector;
        this.clock = clock;
    }

    @Transactional
    UserPrivateResponse signup(SignupRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        ProtectedEmail protectedEmail = emailProtector.protect(normalizedEmail);

        if (userRepository.existsActiveByEmailLookupHash(protectedEmail.emailLookupHash())) {
            throw new EmailAlreadyExistsException();
        }

        UUID userId = UUID.randomUUID();
        Instant now = clock.instant();
        AuthUserRecord user = new AuthUserRecord(
                userId,
                protectedEmail.emailCiphertext(),
                protectedEmail.emailNonce(),
                protectedEmail.emailKeyId(),
                protectedEmail.emailLookupHash(),
                passwordHasher.hash(request.password()),
                request.nickname().trim(),
                now);

        try {
            userRepository.insert(user);
            userRepository.insertDefaultPrivacySettings(userId);
        } catch (DuplicateKeyException exception) {
            throw new EmailAlreadyExistsException();
        }

        return new UserPrivateResponse(userId, normalizedEmail, user.nickname(), false, now);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
