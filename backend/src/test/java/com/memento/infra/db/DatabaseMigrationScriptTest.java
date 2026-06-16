package com.memento.infra.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class DatabaseMigrationScriptTest {

    private static final Path MIGRATION_DIR = Path.of("src", "main", "resources", "db", "migration");
    private static final Pattern BASELINE_NAME =
            Pattern.compile("V\\d{12}__init_p0_p1_schema\\.sql");

    @Test
    void baselineMigrationCreatesP0P1SchemaWith1536DimensionEmbedding() throws IOException {
        assertThat(MIGRATION_DIR).isDirectory();

        List<Path> baselineMigrations = Files.list(MIGRATION_DIR)
                .filter(path -> BASELINE_NAME.matcher(path.getFileName().toString()).matches())
                .toList();

        assertThat(baselineMigrations).hasSize(1);

        String sql = Files.readString(baselineMigrations.getFirst(), StandardCharsets.UTF_8)
                .replaceAll("\\s+", " ")
                .toLowerCase();

        assertThat(sql).contains("create extension if not exists vector");
        assertThat(sql).contains("embedding vector(1536) not null");
        assertThat(sql).doesNotContain(" using hnsw ");
        assertThat(sql).doesNotContain(" using ivfflat ");

        assertThat(sql).contains(
                "create table users",
                "create table refresh_token_sessions",
                "create table user_privacy_settings",
                "create table posts",
                "create table comments",
                "create table tags",
                "create table post_tags",
                "create table post_likes",
                "create table friendships",
                "create table async_jobs",
                "create table memory_chunks",
                "create table memory_embeddings");
    }
}
