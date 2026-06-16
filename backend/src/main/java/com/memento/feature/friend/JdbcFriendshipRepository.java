package com.memento.feature.friend;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcFriendshipRepository implements FriendshipRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcFriendshipRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<FriendshipUserRecord> findActiveUserById(UUID userId) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    """
                    SELECT id, nickname
                    FROM users
                    WHERE id = ?
                      AND status = 'active'
                    """,
                    (rs, rowNum) -> new FriendshipUserRecord(
                            rs.getObject("id", UUID.class),
                            rs.getString("nickname")),
                    userId));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
    }

    @Override
    public boolean existsPendingOrAcceptedBetween(UUID userId, UUID otherUserId) {
        UUID leastUserId = least(userId, otherUserId);
        UUID greatestUserId = greatest(userId, otherUserId);
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM friendships
                    WHERE least_user_id = ?
                      AND greatest_user_id = ?
                      AND status IN ('pending', 'accepted')
                )
                """,
                Boolean.class,
                leastUserId,
                greatestUserId);
        return Boolean.TRUE.equals(exists);
    }

    @Override
    public void insertPending(NewFriendship friendship) {
        jdbcTemplate.update(
                """
                INSERT INTO friendships (
                    id,
                    requester_id,
                    addressee_id,
                    least_user_id,
                    greatest_user_id,
                    status,
                    requested_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
                """,
                friendship.id(),
                friendship.requesterId(),
                friendship.addresseeId(),
                friendship.leastUserId(),
                friendship.greatestUserId(),
                Timestamp.from(friendship.requestedAt()),
                Timestamp.from(friendship.requestedAt()));
    }

    @Override
    public Optional<FriendshipStatusRecord> updatePendingForAddressee(
            UUID friendshipId,
            UUID addresseeId,
            String status,
            Instant respondedAt) {
        List<FriendshipStatusRecord> records = jdbcTemplate.query(
                """
                UPDATE friendships
                SET status = ?,
                    responded_at = ?,
                    updated_at = ?
                WHERE id = ?
                  AND addressee_id = ?
                  AND status = 'pending'
                RETURNING id, status, updated_at
                """,
                (rs, rowNum) -> new FriendshipStatusRecord(
                        rs.getObject("id", UUID.class),
                        rs.getString("status"),
                        rs.getTimestamp("updated_at").toInstant()),
                status,
                Timestamp.from(respondedAt),
                Timestamp.from(respondedAt),
                friendshipId,
                addresseeId);
        return records.stream().findFirst();
    }

    private UUID least(UUID userId, UUID otherUserId) {
        return userId.compareTo(otherUserId) <= 0 ? userId : otherUserId;
    }

    private UUID greatest(UUID userId, UUID otherUserId) {
        return userId.compareTo(otherUserId) >= 0 ? userId : otherUserId;
    }
}
