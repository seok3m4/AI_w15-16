package com.memento.feature.auth;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;

@Component
class RandomRefreshTokenSupplier implements Supplier<String> {

    private static final int TOKEN_BYTES = 48;

    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public String get() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
