import { NextResponse } from "next/server";

import {
  tagWithCountSelect,
  toTagWithCountResponse,
} from "@/lib/tags/serializer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: tagWithCountSelect,
  });

  return NextResponse.json({
    tags: tags.map(toTagWithCountResponse),
  });
}
