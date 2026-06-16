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
    private static final Pattern VECTOR_NULLABILITY_NAME =
            Pattern.compile("V\\d{12}__relax_memory_embedding_vector_nullability\\.sql");
    private static final Pattern ASYNC_JOB_ATTEMPTS_NAME =
            Pattern.compile("V\\d{12}__add_async_job_attempt_limits\\.sql");

    @Test
    void baselineMigrationCreatesP0P1SchemaWith1536DimensionEmbedding() throws IOException {
        assertThat(MIGRATION_DIR).isDirectory();

        List<Path> baselineMigrations = findMigrations(BASELINE_NAME);

        assertThat(baselineMigrations).hasSize(1);

        String sql = normalizedSql(baselineMigrations.getFirst());

        assertThat(sql).contains("create extension if not exists vector");
        assertThat(sql).contains("embedding vector(1536)");
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

    @Test
    void followUpMigrationAllowsPendingEmbeddingsWithoutVector() throws IOException {
        assertThat(MIGRATION_DIR).isDirectory();

        List<Path> migrations = findMigrations(VECTOR_NULLABILITY_NAME);

        assertThat(migrations).hasSize(1);

        String sql = normalizedSql(migrations.getFirst());

        assertThat(sql).contains("alter table memory_embeddings alter column embedding drop not null");
        assertThat(sql).contains("constraint ck_memory_embeddings_vector_matches_status");
        assertThat(sql).contains("status = 'succeeded' and embedding is not null");
        assertThat(sql).contains("status in ('pending', 'running', 'failed') and embedding is null");
    }

    @Test
    void followUpMigrationAddsAsyncJobAttemptLimits() throws IOException {
        assertThat(MIGRATION_DIR).isDirectory();

        List<Path> migrations = findMigrations(ASYNC_JOB_ATTEMPTS_NAME);

        assertThat(migrations).hasSize(1);

        String sql = normalizedSql(migrations.getFirst());

        assertThat(sql).contains("alter table async_jobs");
        assertThat(sql).contains("add column attempt_count integer not null default 0");
        assertThat(sql).contains("add column max_attempts integer not null default 1");
        assertThat(sql).contains("constraint ck_async_jobs_attempts_non_negative");
    }

    private static List<Path> findMigrations(Pattern fileNamePattern) throws IOException {
        try (var paths = Files.list(MIGRATION_DIR)) {
            return paths
                    .filter(path -> fileNamePattern.matcher(path.getFileName().toString()).matches())
                    .toList();
        }
    }

    private static String normalizedSql(Path migration) throws IOException {
        return Files.readString(migration, StandardCharsets.UTF_8)
                .replaceAll("\\s+", " ")
                .toLowerCase();
    }
}
