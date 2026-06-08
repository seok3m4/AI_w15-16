package com.week15.board.post.application;

import com.week15.board.post.domain.Post;
import com.week15.board.post.domain.PostStatus;
import com.week15.board.post.infrastructure.PostRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;

    public PostService(PostRepository postRepository) {
        this.postRepository = postRepository;
    }

    public Page<Post> search(String keyword, Pageable pageable) {
        return postRepository.search(PostStatus.PUBLISHED, normalizeKeyword(keyword), pageable);
    }

    @Transactional
    public Post create(PostCreateCommand command) {
        return postRepository.save(new Post(command.title(), command.content(), command.authorName()));
    }

    @Transactional
    public Post get(Long postId) {
        Post post = getPublishedPost(postId);
        post.increaseViewCount();
        return post;
    }

    @Transactional
    public Post update(Long postId, PostUpdateCommand command) {
        Post post = getPublishedPost(postId);
        post.update(command.title(), command.content());
        return post;
    }

    @Transactional
    public void delete(Long postId) {
        Post post = getPublishedPost(postId);
        post.delete();
    }

    private Post getPublishedPost(Long postId) {
        return postRepository.findByIdAndStatus(postId, PostStatus.PUBLISHED)
                .orElseThrow(() -> new PostNotFoundException(postId));
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return "";
        }
        return keyword.trim();
    }
}
