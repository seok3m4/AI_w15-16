package com.memento.feature.auth;

interface EmailLookupHasher {

    byte[] lookupHash(String normalizedEmail);
}
