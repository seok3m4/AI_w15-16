package com.memento.feature.auth;

interface PasswordVerifier {

    boolean matches(String rawPassword, String encodedPassword);
}
