package com.memento.feature.auth;

interface EmailProtector {

    ProtectedEmail protect(String normalizedEmail);
}
