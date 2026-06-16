package com.memento.feature.auth;

import java.util.Optional;
import java.util.UUID;

interface AuthUserRepository {

    boolean existsActiveByEmailLookupHash(byte[] emailLookupHash);

    Optional<AuthLoginUser> findActiveLoginUserByEmailLookupHash(byte[] emailLookupHash);

    Optional<UserPrivateRecord> findActivePrivateUserById(UUID userId);

    void insert(AuthUserRecord user);

    void insertDefaultPrivacySettings(UUID userId);
}
