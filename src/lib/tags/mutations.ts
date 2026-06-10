import type { Prisma } from "@prisma/client";

async function deleteUnusedTags(tx: Prisma.TransactionClient): Promise<void> {
  await tx.tag.deleteMany({
    where: {
      posts: {
        none: {},
      },
    },
  });
}

export async function replacePostTags(
  tx: Prisma.TransactionClient,
  postId: string,
  tagNames: string[],
): Promise<void> {
  await tx.postTag.deleteMany({
    where: { postId },
  });

  if (tagNames.length === 0) {
    await deleteUnusedTags(tx);
    return;
  }

  const tags = await Promise.all(
    tagNames.map((name) =>
      tx.tag.upsert({
        where: { name },
        update: {},
        create: { name },
        select: { id: true },
      }),
    ),
  );

  await tx.postTag.createMany({
    data: tags.map((tag) => ({
      postId,
      tagId: tag.id,
    })),
    skipDuplicates: true,
  });

  await deleteUnusedTags(tx);
}
