import type { Prisma } from "@prisma/client";

export const tagSelect = {
  id: true,
  name: true,
  createdAt: true,
} satisfies Prisma.TagSelect;

export const tagWithCountSelect = {
  ...tagSelect,
  _count: {
    select: {
      posts: true,
    },
  },
} satisfies Prisma.TagSelect;

type TagRecord = Prisma.TagGetPayload<{
  select: typeof tagSelect;
}>;

type TagWithCountRecord = Prisma.TagGetPayload<{
  select: typeof tagWithCountSelect;
}>;

export function toTagResponse(tag: TagRecord) {
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.createdAt.toISOString(),
  };
}

export function toTagWithCountResponse(tag: TagWithCountRecord) {
  return {
    ...toTagResponse(tag),
    counts: {
      posts: tag._count.posts,
    },
  };
}
