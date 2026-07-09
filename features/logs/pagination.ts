const DEFAULT_LIMIT = 12;

function parsePositiveInt(value: string | string[] | undefined, fallback: number) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.floor(parsed));
}

export function parsePagination(searchParams: {
  page?: string | string[];
  limit?: string | string[];
}) {
  const page = parsePositiveInt(searchParams.page, 1);
  const limit = parsePositiveInt(searchParams.limit, DEFAULT_LIMIT);

  return { page, limit };
}

export function normalizePagination({
  page,
  limit,
  totalItems,
}: {
  page: number;
  limit: number;
  totalItems: number;
}) {
  const normalizedLimit =
    totalItems === 0
      ? DEFAULT_LIMIT
      : Math.min(limit, Math.max(totalItems, DEFAULT_LIMIT));
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedLimit));
  const normalizedPage = Math.min(page, totalPages);

  return {
    limit: normalizedLimit,
    page: normalizedPage,
    skip: (normalizedPage - 1) * normalizedLimit,
    totalItems,
    totalPages,
  };
}
