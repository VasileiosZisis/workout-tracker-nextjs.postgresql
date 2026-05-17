export function slugifyTitle(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "log";
}

export function createUniqueSlug(baseSlug: string, existingSlugs: string[]) {
  const existing = new Set(existingSlugs);

  if (!existing.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  let slug = `${baseSlug}-${suffix}`;

  while (existing.has(slug)) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return slug;
}
