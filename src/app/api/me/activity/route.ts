import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { publicUserSelect } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import { getPostPreviewText } from "@/lib/posts/content";

export const runtime = "nodejs";

const RECENT_ACTIVITY_LIMIT = 5;

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      {
        message: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  const [
    postCount,
    commentCount,
    voteCount,
    viewAggregate,
    receivedVoteGroups,
    recentPosts,
    recentComments,
    recentVotes,
  ] = await Promise.all([
    prisma.post.count({
      where: {
        authorId: currentUser.id,
      },
    }),
    prisma.comment.count({
      where: {
        authorId: currentUser.id,
      },
    }),
    prisma.postVote.count({
      where: {
        userId: currentUser.id,
      },
    }),
    prisma.post.aggregate({
      where: {
        authorId: currentUser.id,
      },
      _sum: {
        viewCount: true,
      },
    }),
    prisma.postVote.groupBy({
      by: ["type"],
      where: {
        post: {
          authorId: currentUser.id,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.post.findMany({
      where: {
        authorId: currentUser.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: RECENT_ACTIVITY_LIMIT,
      select: {
        id: true,
        title: true,
        content: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        votes: {
          select: {
            type: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    }),
    prisma.comment.findMany({
      where: {
        authorId: currentUser.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: RECENT_ACTIVITY_LIMIT,
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.postVote.findMany({
      where: {
        userId: currentUser.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: RECENT_ACTIVITY_LIMIT,
      select: {
        id: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        post: {
          select: {
            id: true,
            title: true,
            author: {
              select: publicUserSelect,
            },
          },
        },
      },
    }),
  ]);

  const receivedUpVotes =
    receivedVoteGroups.find((group) => group.type === "UP")?._count._all ?? 0;
  const receivedDownVotes =
    receivedVoteGroups.find((group) => group.type === "DOWN")?._count._all ?? 0;

  return NextResponse.json(
    {
      user: currentUser,
      stats: {
        posts: postCount,
        comments: commentCount,
        votes: voteCount,
        views: viewAggregate._sum.viewCount ?? 0,
        receivedUpVotes,
        receivedDownVotes,
        receivedVoteScore: receivedUpVotes - receivedDownVotes,
      },
      recentPosts: recentPosts.map((post) => {
        const upVotes = post.votes.filter((vote) => vote.type === "UP").length;
        const downVotes = post.votes.filter((vote) => vote.type === "DOWN").length;

        return {
          id: post.id,
          title: post.title,
          preview: getPostPreviewText(post.content, 120),
          viewCount: post.viewCount,
          commentCount: post._count.comments,
          upVotes,
          downVotes,
          voteScore: upVotes - downVotes,
          tags: post.tags.map(({ tag }) => tag),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
      recentComments: recentComments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        post: comment.post,
      })),
      recentVotes: recentVotes.map((vote) => ({
        id: vote.id,
        type: vote.type,
        createdAt: vote.createdAt.toISOString(),
        updatedAt: vote.updatedAt.toISOString(),
        post: vote.post,
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
