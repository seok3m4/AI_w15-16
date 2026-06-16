package com.junglecamp.backend.board.repository;

import com.junglecamp.backend.board.model.BoardPost;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BoardPostRepository extends JpaRepository<BoardPost, Long> {

	@Query("""
			select distinct post
			from BoardPost post
			left join post.tags tagFilter
			where post.hiddenAt is null
			and (:query is null or :query = ''
				or (post.deletedAt is null and (
					lower(post.title) like concat('%', :query, '%')
					or lower(post.content) like concat('%', :query, '%'))))
			and (:tag is null or tagFilter.name = :tag)
			and (:category is null or post.category = :category)
			order by post.createdAt desc, post.id desc
			""")
	List<BoardPost> search(
			@Param("query") String query,
			@Param("tag") String tag,
			@Param("category") String category);

	@EntityGraph(attributePaths = {"tags"})
	@Query("select post from BoardPost post where post.id = :id and post.hiddenAt is null")
	Optional<BoardPost> findDetailedById(@Param("id") Long id);
}
