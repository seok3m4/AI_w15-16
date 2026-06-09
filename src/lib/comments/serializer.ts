import type { Prisma } from "@prisma/client";

import { publicUserSelect, toPublicUser } from "@/lib/auth/user";

export const commentSelect = {
  id: true,
  content: true,
  postId: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: publicUserSelect,
  },
} satisfies Prisma.CommentSelect;

type CommentRecord = Prisma.CommentGetPayload<{
  select: typeof commentSelect;
}>;

export function toCommentResponse(comment: CommentRecord) {
  return {
    id: comment.id,
    content: comment.content,
    postId: comment.postId,
    authorId: comment.authorId,
    author: toPublicUser(comment.author),
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}
