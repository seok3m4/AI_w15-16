package com.junglecamp.backend.board.repository;

import com.junglecamp.backend.board.model.BoardTag;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardTagRepository extends JpaRepository<BoardTag, Long> {

	Optional<BoardTag> findByName(String name);

	List<BoardTag> findByNameIn(Collection<String> names);

	List<BoardTag> findAllByOrderByNameAsc();
}
