import Link from "next/link";
import { PaginationPageSizeSelect } from "@/components/pagination-page-size-select";
import {
  buildPaginationHref,
  type PreservedSearchParams,
} from "@/components/pagination-url";
import { getPageSizeOptions } from "@/features/logs/pagination";

export function PaginationNav({
  ariaLabel,
  baseHref,
  limit,
  page,
  placement,
  preservedParams,
  totalItems,
  totalPages,
}: Readonly<{
  ariaLabel: string;
  baseHref: string;
  limit: number;
  page: number;
  placement: "top" | "bottom";
  preservedParams?: PreservedSearchParams;
  totalItems: number;
  totalPages: number;
}>) {
  const pageSizeOptions = getPageSizeOptions(totalItems);

  if (totalPages <= 1 && pageSizeOptions.length === 0) {
    return null;
  }

  return (
    <nav
      className={`pagination pagination-${placement}`}
      aria-label={`${ariaLabel} ${placement}`}
    >
      {pageSizeOptions.length > 0 ? (
        <div
          aria-label={`${ariaLabel} page size`}
          className="pagination-page-size"
        >
          <span>Show</span>
          <PaginationPageSizeSelect
            ariaLabel={`${ariaLabel} page size`}
            baseHref={baseHref}
            limit={limit}
            options={pageSizeOptions}
            preservedParams={preservedParams}
          />
        </div>
      ) : (
        <span />
      )}
      {totalPages > 1 ? (
        <span className="pagination-status">
          Page {page} of {totalPages}
        </span>
      ) : (
        <span />
      )}
      <div className="pagination-links">
        {page > 1 ? (
          <Link
            className="text-link"
            href={buildPaginationHref({
              baseHref,
              limit,
              page: page - 1,
              preservedParams,
            })}
          >
            Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            className="text-link"
            href={buildPaginationHref({
              baseHref,
              limit,
              page: page + 1,
              preservedParams,
            })}
          >
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
