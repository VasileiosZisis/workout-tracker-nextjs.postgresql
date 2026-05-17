const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

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
  const limit = Math.min(parsePositiveInt(searchParams.limit, DEFAULT_LIMIT), MAX_LIMIT);

  return { page, limit };
}
