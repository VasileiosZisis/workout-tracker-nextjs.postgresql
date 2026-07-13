export const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
export const DEFAULT_LIMIT = PAGE_SIZE_OPTIONS[0];
export const MAX_LIMIT = PAGE_SIZE_OPTIONS[PAGE_SIZE_OPTIONS.length - 1];

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
  const requestedLimit = parsePositiveInt(searchParams.limit, DEFAULT_LIMIT);
  const limit =
    PAGE_SIZE_OPTIONS.find((option) => requestedLimit <= option) ?? MAX_LIMIT;

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
  const normalizedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
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

export function getPageSizeOptions(totalItems: number) {
  if (totalItems <= DEFAULT_LIMIT) {
    return [];
  }

  return PAGE_SIZE_OPTIONS.filter(
    (option, index) => index === 0 || PAGE_SIZE_OPTIONS[index - 1] < totalItems,
  );
}
