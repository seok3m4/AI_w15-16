package com.junglecamp.backend.rag.service;

import com.junglecamp.backend.board.model.BoardPost;
import com.junglecamp.backend.rag.dto.RagDtos;
import com.junglecamp.backend.rag.dto.RagDtos.RagSearchResponse;
import com.junglecamp.backend.rag.dto.RagDtos.RagSearchResult;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RagIndexService {

	private static final String BOARD_POST = "BOARD_POST";

	private final JdbcTemplate jdbcTemplate;
	private final OpenAiEmbeddingService embeddingService;

	public RagIndexService(JdbcTemplate jdbcTemplate, OpenAiEmbeddingService embeddingService) {
		this.jdbcTemplate = jdbcTemplate;
		this.embeddingService = embeddingService;
	}

	@Transactional
	public void indexBoardPost(BoardPost post) {
		String content = post.getTitle() + "\n\n" + post.getContent();
		Long documentId = findDocumentId(BOARD_POST, post.getId())
				.map(existingId -> updateDocument(existingId, post, content))
				.orElseGet(() -> insertDocument(post, content));
		jdbcTemplate.update("DELETE FROM rag_chunks WHERE document_id = ?", documentId);
		Long chunkId = insertChunk(documentId, content, post.getId());
		embeddingService.embedAsVectorLiteral(content)
				.ifPresent(vector -> updateChunkEmbedding(chunkId, vector));
		recordJob(documentId, BOARD_POST, post.getId(), "success", null);
	}

	@Transactional
	public void deleteBoardPost(Long postId) {
		findDocumentId(BOARD_POST, postId).ifPresent(documentId -> {
			jdbcTemplate.update("DELETE FROM rag_documents WHERE id = ?", documentId);
			recordJob(null, BOARD_POST, postId, "deleted", null);
		});
	}

	@Transactional(readOnly = true)
	public RagSearchResponse search(String query, List<String> sourceTypes, int requestedLimit) {
		String normalized = normalizeQuery(query);
		if (normalized == null) {
			return new RagSearchResponse(List.of());
		}

		int limit = Math.max(1, Math.min(requestedLimit <= 0 ? 5 : requestedLimit, 10));
		List<RagSearchResult> keywordResults = keywordSearch(normalized, sourceTypes, limit);
		return new RagSearchResponse(keywordResults);
	}

	private Optional<Long> findDocumentId(String sourceType, Long sourceId) {
		List<Long> ids = jdbcTemplate.query(
				"SELECT id FROM rag_documents WHERE source_type = ? AND source_id = ?",
				(resultSet, rowNumber) -> resultSet.getLong("id"),
				sourceType,
				sourceId);
		return ids.stream().findFirst();
	}

	private Long insertDocument(BoardPost post, String content) {
		try {
			return insertDocument(post, content, true);
		} catch (DataAccessException exception) {
			return insertDocument(post, content, false);
		}
	}

	private Long insertDocument(BoardPost post, String content, boolean castJsonb) {
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			String metadataPlaceholder = castJsonb ? "?::jsonb" : "?";
			PreparedStatement statement = connection.prepareStatement("""
					INSERT INTO rag_documents (source_type, source_id, title, content_hash, metadata)
					VALUES (?, ?, ?, ?, %s)
					""".formatted(metadataPlaceholder), new String[] { "id" });
			statement.setString(1, BOARD_POST);
			statement.setLong(2, post.getId());
			statement.setString(3, truncate(post.getTitle(), 200));
			statement.setString(4, sha256(content));
			statement.setString(5, "{\"sourceType\":\"BOARD_POST\"}");
			return statement;
		}, keyHolder);
		Number key = keyHolder.getKey();
		if (key == null) {
			throw new IllegalStateException("RAG document id was not generated");
		}
		return key.longValue();
	}

	private Long updateDocument(Long documentId, BoardPost post, String content) {
		jdbcTemplate.update("""
				UPDATE rag_documents
				SET title = ?, content_hash = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
				""", truncate(post.getTitle(), 200), sha256(content), documentId);
		return documentId;
	}

	private Long insertChunk(Long documentId, String content, Long postId) {
		try {
			return insertChunk(documentId, content, postId, true);
		} catch (DataAccessException exception) {
			return insertChunk(documentId, content, postId, false);
		}
	}

	private Long insertChunk(Long documentId, String content, Long postId, boolean castJsonb) {
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			String metadataPlaceholder = castJsonb ? "?::jsonb" : "?";
			PreparedStatement statement = connection.prepareStatement("""
					INSERT INTO rag_chunks (document_id, chunk_index, content, token_count, metadata)
					VALUES (?, 0, ?, ?, %s)
					""".formatted(metadataPlaceholder), new String[] { "id" });
			statement.setLong(1, documentId);
			statement.setString(2, content);
			statement.setInt(3, approximateTokenCount(content));
			statement.setString(4, "{\"sourceUrl\":\"/api/posts/" + postId + "\"}");
			return statement;
		}, keyHolder);
		Number key = keyHolder.getKey();
		if (key == null) {
			throw new IllegalStateException("RAG chunk id was not generated");
		}
		return key.longValue();
	}

	private void updateChunkEmbedding(Long chunkId, String vectorLiteral) {
		try {
			jdbcTemplate.update("UPDATE rag_chunks SET embedding = ?::vector WHERE id = ?", vectorLiteral, chunkId);
		} catch (DataAccessException exception) {
			jdbcTemplate.update("UPDATE rag_chunks SET embedding = ? WHERE id = ?", vectorLiteral, chunkId);
		}
	}

	private List<RagSearchResult> keywordSearch(String normalized, List<String> sourceTypes, int limit) {
		if (sourceTypes == null || sourceTypes.isEmpty()) {
			return jdbcTemplate.query("""
					SELECT c.id, d.source_type, d.source_id, d.title, c.content, d.updated_at
					FROM rag_chunks c
					JOIN rag_documents d ON d.id = c.document_id
					ORDER BY d.updated_at DESC, c.id DESC
					LIMIT 50
					""", (resultSet, rowNumber) -> mapResult(resultSet, normalized))
					.stream()
					.filter(result -> result.score() > 0)
					.limit(limit)
					.toList();
		}
		String firstSourceType = sourceTypes.get(0);
		return jdbcTemplate.query("""
				SELECT c.id, d.source_type, d.source_id, d.title, c.content, d.updated_at
				FROM rag_chunks c
				JOIN rag_documents d ON d.id = c.document_id
				WHERE d.source_type = ?
				ORDER BY d.updated_at DESC, c.id DESC
				LIMIT 50
				""", (resultSet, rowNumber) -> mapResult(resultSet, normalized), firstSourceType)
				.stream()
				.filter(result -> result.score() > 0)
				.limit(limit)
				.toList();
	}

	private RagSearchResult mapResult(ResultSet resultSet, String normalizedQuery) throws SQLException {
		long sourceId = resultSet.getLong("source_id");
		String sourceType = resultSet.getString("source_type");
		String content = resultSet.getString("content");
		double score = keywordScore(resultSet.getString("title") + " " + content, normalizedQuery);
		return new RagSearchResult(
				"rag-chunk-" + resultSet.getLong("id"),
				sourceType,
				String.valueOf(sourceId),
				resultSet.getString("title"),
				sourceType,
				sourceUrl(sourceType, sourceId),
				snippet(content),
				timestamp(resultSet.getTimestamp("updated_at")),
				score);
	}

	private double keywordScore(String content, String normalizedQuery) {
		String normalizedContent = content.toLowerCase();
		String[] terms = normalizedQuery.split("\\s+");
		int matches = 0;
		for (String term : terms) {
			if (!term.isBlank() && normalizedContent.contains(term)) {
				matches++;
			}
		}
		return terms.length == 0 ? 0 : (double) matches / terms.length;
	}

	private void recordJob(Long documentId, String sourceType, Long sourceId, String status, String errorMessage) {
		jdbcTemplate.update("""
				INSERT INTO rag_index_jobs (document_id, source_type, source_id, status, error_message)
				VALUES (?, ?, ?, ?, ?)
				""", documentId, sourceType, sourceId, status, errorMessage);
	}

	private String sourceUrl(String sourceType, long sourceId) {
		if (BOARD_POST.equals(sourceType)) {
			return "/api/posts/" + sourceId;
		}
		return "";
	}

	private String normalizeQuery(String query) {
		if (query == null || query.isBlank()) {
			return null;
		}
		return query.trim().toLowerCase();
	}

	private int approximateTokenCount(String content) {
		return Math.max(1, content.split("\\s+").length);
	}

	private String sha256(String content) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(content.getBytes(StandardCharsets.UTF_8)));
		} catch (Exception exception) {
			throw new IllegalStateException("Could not hash RAG content", exception);
		}
	}

	private String snippet(String content) {
		return truncate(content.replaceAll("\\s+", " ").trim(), 220);
	}

	private String truncate(String value, int maxLength) {
		if (value == null || value.length() <= maxLength) {
			return value;
		}
		return value.substring(0, maxLength - 3) + "...";
	}

	private String timestamp(Timestamp timestamp) {
		return timestamp == null ? null : timestamp.toInstant().atOffset(ZoneOffset.UTC).toString();
	}
}
