package com.memento.feature.auth;

import java.util.UUID;

interface AuthUserRepository {

    boolean existsActiveByEmailLookupHash(byte[] emailLookupHash);

    void insert(AuthUserRecord user);

    void insertDefaultPrivacySettings(UUID userId);
}
