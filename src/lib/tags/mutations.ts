import type { Prisma } from "@prisma/client";

export async function replacePostTags(
  tx: Prisma.TransactionClient,
  postId: string,
  tagNames: string[],
): Promise<void> {
  await tx.postTag.deleteMany({
    where: { postId },
  });

  if (tagNames.length === 0) {
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
}
