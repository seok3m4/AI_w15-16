import type { Prisma } from "@prisma/client";

import { publicUserSelect, toPublicUser } from "@/lib/auth/user";
import { tagSelect, toTagResponse } from "@/lib/tags/serializer";

export const postSelect = {
  id: true,
  title: true,
  content: true,
  viewCount: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: publicUserSelect,
  },
  tags: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      tag: {
        select: tagSelect,
      },
    },
  },
  _count: {
    select: {
      comments: true,
      tags: true,
    },
  },
} satisfies Prisma.PostSelect;

type PostRecord = Prisma.PostGetPayload<{
  select: typeof postSelect;
}>;

export function toPostResponse(post: PostRecord) {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    authorId: post.authorId,
    author: toPublicUser(post.author),
    tags: post.tags.map(({ tag }) => toTagResponse(tag)),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    counts: {
      comments: post._count.comments,
      tags: post._count.tags,
      views: post.viewCount,
    },
  };
}
