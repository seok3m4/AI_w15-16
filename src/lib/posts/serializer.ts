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
  votes: {
    select: {
      type: true,
      userId: true,
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

export function toPostResponse(post: PostRecord, viewerId?: string | null) {
  const upVotes = post.votes.filter((vote) => vote.type === "UP").length;
  const downVotes = post.votes.filter((vote) => vote.type === "DOWN").length;
  const viewerVote =
    viewerId && post.votes.find((vote) => vote.userId === viewerId)?.type;

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
      upVotes,
      downVotes,
      voteScore: upVotes - downVotes,
    },
    viewerVote: viewerVote ?? null,
  };
}
