import type { Prisma } from "@prisma/client";

import { parsePagination, type Pagination } from "@/lib/pagination";
import { normalizeTagName } from "@/lib/tags/validation";

type ValidationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      message: string;
    };

type PostListQuery = {
  pagination: Pagination;
  searchQuery: string;
  tagName: string;
  where: Prisma.PostWhereInput;
};

const SEARCH_QUERY_MAX_LENGTH = 100;

function normalizeSearchQuery(value: string | null): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function parsePostListQuery(
  searchParams: URLSearchParams,
): ValidationResult<PostListQuery> {
  const pagination = parsePagination(searchParams);
  const searchQuery = normalizeSearchQuery(searchParams.get("q"));
  const rawTagName = searchParams.get("tag");
  const tagName = rawTagName ? normalizeTagName(rawTagName) : "";

  if (searchQuery.length > SEARCH_QUERY_MAX_LENGTH) {
    return {
      ok: false,
      message: `Search query must be ${SEARCH_QUERY_MAX_LENGTH} characters or fewer.`,
    };
  }

  const conditions: Prisma.PostWhereInput[] = [];

  if (searchQuery) {
    conditions.push({
      OR: [
        {
          title: {
            contains: searchQuery,
            mode: "insensitive",
          },
        },
        {
          content: {
            contains: searchQuery,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (tagName) {
    conditions.push({
      tags: {
        some: {
          tag: {
            name: tagName,
          },
        },
      },
    });
  }

  return {
    ok: true,
    data: {
      pagination,
      searchQuery,
      tagName,
      where: conditions.length > 0 ? { AND: conditions } : {},
    },
  };
}
