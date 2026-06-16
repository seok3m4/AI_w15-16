package com.memento.feature.auth;

interface EmailUnprotector {

    String unprotect(byte[] emailCiphertext, byte[] emailNonce);
}
