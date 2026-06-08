package com.week15.board.post.infrastructure;

import com.week15.board.post.domain.Post;
import com.week15.board.post.domain.PostStatus;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, Long> {

    Optional<Post> findByIdAndStatus(Long id, PostStatus status);

    @Query("""
            select p
            from Post p
            where p.status = :status
              and (
                :keyword = ''
                or lower(p.title) like lower(concat('%', :keyword, '%'))
                or lower(p.content) like lower(concat('%', :keyword, '%'))
                or lower(p.authorName) like lower(concat('%', :keyword, '%'))
              )
            """)
    Page<Post> search(
            @Param("status") PostStatus status,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
