package com.memento.feature.auth;

record ProtectedEmail(
        byte[] emailCiphertext,
        byte[] emailNonce,
        String emailKeyId,
        byte[] emailLookupHash) {
}
