package com.memento.feature.auth;

interface RefreshTokenHasher {

    byte[] hash(String rawToken);
}
