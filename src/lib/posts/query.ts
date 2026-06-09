export type Pagination = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function getPositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parsePagination(searchParams: URLSearchParams): Pagination {
  const page = getPositiveInteger(searchParams.get("page"), DEFAULT_PAGE);
  const requestedPageSize = getPositiveInteger(
    searchParams.get("pageSize"),
    DEFAULT_PAGE_SIZE,
  );
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
