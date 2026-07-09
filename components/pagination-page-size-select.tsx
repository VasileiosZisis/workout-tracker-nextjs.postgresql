"use client";

import { useRouter } from "next/navigation";

export function PaginationPageSizeSelect({
  ariaLabel,
  baseHref,
  limit,
  options,
}: Readonly<{
  ariaLabel: string;
  baseHref: string;
  limit: number;
  options: number[];
}>) {
  const router = useRouter();

  return (
    <select
      aria-label={ariaLabel}
      className="pagination-page-size-select"
      onChange={(event) => {
        router.push(`${baseHref}?page=1&limit=${event.currentTarget.value}`);
      }}
      value={limit}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
