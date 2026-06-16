package com.memento.feature.embedding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.springframework.jdbc.core.JdbcTemplate;

class JdbcPostMemoryStatusRepositoryTest {

    private static final UUID POST_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OWNER_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Test
    void markSucceededUpdatesOnlyCurrentOwnersActivePost() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcPostMemoryStatusRepository repository = new JdbcPostMemoryStatusRepository(jdbcTemplate);

        repository.markSucceeded(POST_ID, OWNER_ID);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(
                sqlCaptor.capture(),
                ArgumentMatchers.eq("succeeded"),
                ArgumentMatchers.eq(POST_ID),
                ArgumentMatchers.eq(OWNER_ID));
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("update posts")
                .contains("set memory_status = ?")
                .contains("where id = ?")
                .contains("and author_id = ?")
                .contains("and deleted_at is null");
    }
}
