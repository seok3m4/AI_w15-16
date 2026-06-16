package com.memento.feature.auth;

interface PasswordHasher {

    String hash(String rawPassword);
}
