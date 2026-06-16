package com.memento.feature.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Constructor;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;

class AuthSecretConfigurationTest {

    @Test
    void jwtSigningKeyValueExpressionHasNoDefaultFallback() {
        assertThat(firstConstructorParameterValue(HmacJwtTokenService.class))
                .isEqualTo("${memento.auth.jwt-signing-key}");
    }

    @Test
    void refreshTokenPepperValueExpressionHasNoDefaultFallback() {
        assertThat(firstConstructorParameterValue(HmacRefreshTokenHasher.class))
                .isEqualTo("${memento.auth.refresh-token-pepper}");
    }

    private String firstConstructorParameterValue(Class<?> type) {
        Constructor<?> constructor = type.getDeclaredConstructors()[0];
        return constructor.getParameters()[0].getAnnotation(Value.class).value();
    }
}
