package com.memento.feature.memory;

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
}
