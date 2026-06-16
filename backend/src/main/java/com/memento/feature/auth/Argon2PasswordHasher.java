package com.memento.feature.auth;

import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
class Argon2PasswordHasher implements PasswordHasher, PasswordVerifier {

    private final Argon2PasswordEncoder encoder =
            new Argon2PasswordEncoder(16, 32, 1, 19_456, 2);

    @Override
    public String hash(String rawPassword) {
        return encoder.encode(rawPassword);
    }

    @Override
    public boolean matches(String rawPassword, String encodedPassword) {
        return encoder.matches(rawPassword, encodedPassword);
    }
}
