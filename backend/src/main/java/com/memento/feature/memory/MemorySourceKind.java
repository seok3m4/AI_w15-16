package com.memento.feature.memory;

import java.util.Arrays;

enum MemorySourceKind {
    POST_TITLE("post_title"),
    POST_CONTENT("post_content"),
    TAG("tag");

    private final String databaseValue;

    MemorySourceKind(String databaseValue) {
        this.databaseValue = databaseValue;
    }

    String databaseValue() {
        return databaseValue;
    }

    static MemorySourceKind fromDatabaseValue(String value) {
        return Arrays.stream(values())
                .filter(kind -> kind.databaseValue.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported memory source kind: " + value));
    }
}
