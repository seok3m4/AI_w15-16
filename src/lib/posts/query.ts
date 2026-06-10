import type { Prisma } from "@prisma/client";

import { parsePagination, type Pagination } from "@/lib/pagination";
import {
  getTagComparisonKey,
  normalizeTagName,
} from "@/lib/tags/validation";

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
  tagNames: string[];
  where: Prisma.PostWhereInput;
};

const SEARCH_QUERY_MAX_LENGTH = 100;

function normalizeSearchQuery(value: string | null): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function normalizeTagNames(searchParams: URLSearchParams): string[] {
  const tagNames: string[] = [];
  const tagKeys = new Set<string>();

  searchParams
    .getAll("tag")
    .flatMap((value) => value.split(","))
    .map(normalizeTagName)
    .filter(Boolean)
    .forEach((tagName) => {
      const tagKey = getTagComparisonKey(tagName);

      if (!tagKeys.has(tagKey)) {
        tagKeys.add(tagKey);
        tagNames.push(tagName);
      }
    });

  return tagNames;
}

export function parsePostListQuery(
  searchParams: URLSearchParams,
): ValidationResult<PostListQuery> {
  const pagination = parsePagination(searchParams);
  const searchQuery = normalizeSearchQuery(searchParams.get("q"));
  const tagNames = normalizeTagNames(searchParams);

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

  if (tagNames.length > 0) {
    conditions.push({
      OR: tagNames.map((tagName) => ({
        tags: {
          some: {
            tag: {
              name: {
                equals: tagName,
                mode: "insensitive",
              },
            },
          },
        },
      })),
    });
  }

  return {
    ok: true,
    data: {
      pagination,
      searchQuery,
      tagNames,
      where: conditions.length > 0 ? { AND: conditions } : {},
    },
  };
}
