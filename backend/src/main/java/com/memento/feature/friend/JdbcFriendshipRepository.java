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
    public boolean existsAcceptedBetween(UUID userId, UUID otherUserId) {
        UUID leastUserId = least(userId, otherUserId);
        UUID greatestUserId = greatest(userId, otherUserId);
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM friendships
                    WHERE least_user_id = ?
                      AND greatest_user_id = ?
                      AND status = 'accepted'
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

    @Override
    public List<FriendshipListRecord> findPageByUserAndStatus(
            UUID userId,
            String status,
            int limit,
            int offset) {
        return jdbcTemplate.query(
                """
                SELECT f.id,
                       CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END AS user_id,
                       u.nickname,
                       f.status,
                       CASE WHEN f.requester_id = ? THEN 'outgoing' ELSE 'incoming' END AS direction,
                       f.requested_at,
                       f.updated_at
                FROM friendships f
                JOIN users u
                  ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
                WHERE (f.requester_id = ? OR f.addressee_id = ?)
                  AND f.status = ?
                ORDER BY f.updated_at DESC, f.requested_at DESC
                LIMIT ? OFFSET ?
                """,
                (rs, rowNum) -> new FriendshipListRecord(
                        rs.getObject("id", UUID.class),
                        new FriendshipUserRecord(
                                rs.getObject("user_id", UUID.class),
                                rs.getString("nickname")),
                        rs.getString("status"),
                        rs.getString("direction"),
                        rs.getTimestamp("requested_at").toInstant(),
                        rs.getTimestamp("updated_at").toInstant()),
                userId,
                userId,
                userId,
                userId,
                userId,
                status,
                limit,
                offset);
    }

    @Override
    public long countByUserAndStatus(UUID userId, String status) {
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM friendships
                WHERE (requester_id = ? OR addressee_id = ?)
                  AND status = ?
                """,
                Long.class,
                userId,
                userId,
                status);
        return count == null ? 0 : count;
    }

    @Override
    public Optional<FriendshipStatusRecord> cancelPendingForRequester(
            UUID friendshipId,
            UUID requesterId,
            Instant cancelledAt) {
        List<FriendshipStatusRecord> records = jdbcTemplate.query(
                """
                UPDATE friendships
                SET status = 'cancelled',
                    updated_at = ?
                WHERE id = ?
                  AND requester_id = ?
                  AND status = 'pending'
                RETURNING id, status, updated_at
                """,
                (rs, rowNum) -> new FriendshipStatusRecord(
                        rs.getObject("id", UUID.class),
                        rs.getString("status"),
                        rs.getTimestamp("updated_at").toInstant()),
                Timestamp.from(cancelledAt),
                friendshipId,
                requesterId);
        return records.stream().findFirst();
    }

    @Override
    public Optional<FriendshipStatusRecord> removeAcceptedForParticipant(
            UUID friendshipId,
            UUID participantId,
            Instant removedAt) {
        List<FriendshipStatusRecord> records = jdbcTemplate.query(
                """
                UPDATE friendships
                SET status = 'removed',
                    removed_at = ?,
                    updated_at = ?
                WHERE id = ?
                  AND (requester_id = ? OR addressee_id = ?)
                  AND status = 'accepted'
                RETURNING id, status, updated_at
                """,
                (rs, rowNum) -> new FriendshipStatusRecord(
                        rs.getObject("id", UUID.class),
                        rs.getString("status"),
                        rs.getTimestamp("updated_at").toInstant()),
                Timestamp.from(removedAt),
                Timestamp.from(removedAt),
                friendshipId,
                participantId,
                participantId);
        return records.stream().findFirst();
    }

    private UUID least(UUID userId, UUID otherUserId) {
        return userId.compareTo(otherUserId) <= 0 ? userId : otherUserId;
    }

    private UUID greatest(UUID userId, UUID otherUserId) {
        return userId.compareTo(otherUserId) >= 0 ? userId : otherUserId;
    }
}
