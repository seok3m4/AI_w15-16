package com.junglecamp.backend.board.repository;

import com.junglecamp.backend.board.model.BoardComment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardCommentRepository extends JpaRepository<BoardComment, Long> {
}
