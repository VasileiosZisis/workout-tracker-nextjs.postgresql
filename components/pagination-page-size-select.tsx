"use client";

import { useRouter } from "next/navigation";
import {
  buildPaginationHref,
  type PreservedSearchParams,
} from "@/components/pagination-url";

export function PaginationPageSizeSelect({
  ariaLabel,
  baseHref,
  limit,
  options,
  preservedParams,
}: Readonly<{
  ariaLabel: string;
  baseHref: string;
  limit: number;
  options: number[];
  preservedParams?: PreservedSearchParams;
}>) {
  const router = useRouter();

  return (
    <select
      aria-label={ariaLabel}
      className="pagination-page-size-select"
      onChange={(event) => {
        router.push(
          buildPaginationHref({
            baseHref,
            limit: Number(event.currentTarget.value),
            page: 1,
            preservedParams,
          }),
        );
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
