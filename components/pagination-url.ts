export type PreservedSearchParams = Readonly<
  Record<string, string | undefined>
>;

export function buildPaginationHref({
  baseHref,
  limit,
  page,
  preservedParams = {},
}: {
  baseHref: string;
  limit: number;
  page: number;
  preservedParams?: PreservedSearchParams;
}) {
  const params = new URLSearchParams();

  Object.entries(preservedParams).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  params.set("page", String(page));
  params.set("limit", String(limit));

  return `${baseHref}?${params.toString()}`;
}
