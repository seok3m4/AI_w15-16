package com.junglecamp.backend.board;

import com.junglecamp.backend.board.repository.BoardCommentRepository;
import com.junglecamp.backend.board.repository.BoardPostRepository;
import com.junglecamp.backend.board.repository.BoardTagRepository;
import com.junglecamp.backend.board.service.BoardPostService;
import com.junglecamp.backend.rag.service.RagIndexService;
import com.junglecamp.backend.user.repository.AppUserRepository;
import com.junglecamp.backend.user.service.AppUserService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BoardPostServiceTests {

	@Test
	void searchUsesEmptyQueryForUnfilteredFeed() {
		BoardPostRepository postRepository = mock(BoardPostRepository.class);
		when(postRepository.search(nullable(String.class), nullable(String.class), nullable(String.class)))
				.thenReturn(List.of());

		BoardPostService service = new BoardPostService(
				postRepository,
				mock(BoardTagRepository.class),
				mock(BoardCommentRepository.class),
				mock(RagIndexService.class),
				mock(AppUserService.class),
				mock(AppUserRepository.class),
				mock(JdbcTemplate.class));

		service.search(null, null, null, null, 0, 10, null);

		verify(postRepository).search(eq(""), isNull(), isNull());
	}
}
