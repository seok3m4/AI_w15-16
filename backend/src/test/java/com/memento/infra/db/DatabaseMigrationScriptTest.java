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
    private static final Pattern MEMORY_REINDEX_DEDUPE_NAME =
            Pattern.compile("V\\d{12}__add_memory_reindex_dedupe_indexes\\.sql");
    private static final Pattern CONTEXT_CAPSULES_NAME =
            Pattern.compile("V\\d{12}__add_context_capsules\\.sql");

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

    @Test
    void followUpMigrationAddsMemoryReindexDedupeIndexesWithoutVectorIndex() throws IOException {
        assertThat(MIGRATION_DIR).isDirectory();

        List<Path> migrations = findMigrations(MEMORY_REINDEX_DEDUPE_NAME);

        assertThat(migrations).hasSize(1);

        String sql = normalizedSql(migrations.getFirst());

        assertThat(sql).contains("create unique index uq_async_jobs_memory_reindex_pending_post");
        assertThat(sql).contains("on async_jobs (owner_id, (input ->> 'postid'))");
        assertThat(sql).contains("where type = 'memory_reindex' and status = 'pending'");
        assertThat(sql).contains("create unique index uq_memory_embeddings_active_chunk_provider_model");
        assertThat(sql).contains("on memory_embeddings (chunk_id, provider, model)");
        assertThat(sql).contains("where status in ('pending', 'running', 'succeeded')");
        assertThat(sql).doesNotContain(" using hnsw ");
        assertThat(sql).doesNotContain(" using ivfflat ");
    }

    @Test
    void followUpMigrationAddsContextCapsuleTables() throws IOException {
        assertThat(MIGRATION_DIR).isDirectory();

        List<Path> migrations = findMigrations(CONTEXT_CAPSULES_NAME);

        assertThat(migrations).hasSize(1);

        String sql = normalizedSql(migrations.getFirst());

        assertThat(sql).contains("create table context_capsules");
        assertThat(sql).contains("owner_id uuid not null references users (id) on delete cascade");
        assertThat(sql).contains("key_facts jsonb not null default '[]'::jsonb");
        assertThat(sql).contains("tags jsonb not null default '[]'::jsonb");
        assertThat(sql).contains("contains_friend_context boolean not null default false");
        assertThat(sql).contains("create table context_capsule_sources");
        assertThat(sql).contains("capsule_id uuid not null references context_capsules (id) on delete cascade");
        assertThat(sql).contains("chunk_id uuid null references memory_chunks (id) on delete set null");
        assertThat(sql).contains("create index idx_context_capsules_owner_active_created");
        assertThat(sql).contains("create index idx_capsule_sources_owner_user");
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
