package com.memento.feature.comment;

import java.util.Optional;

interface CommentRepository {

    Optional<CommentRecord> saveOnOwnedPost(NewComment comment);
}
