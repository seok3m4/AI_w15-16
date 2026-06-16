package com.memento.feature.auth;

import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
class Argon2PasswordHasher implements PasswordHasher {

    private final Argon2PasswordEncoder encoder =
            new Argon2PasswordEncoder(16, 32, 1, 19_456, 2);

    @Override
    public String hash(String rawPassword) {
        return encoder.encode(rawPassword);
    }
}
