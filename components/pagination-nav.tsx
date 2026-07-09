import Link from "next/link";
import { PaginationPageSizeSelect } from "@/components/pagination-page-size-select";

const PAGE_SIZE_STEP = 12;

function getPageSizeOptions(totalItems: number) {
  if (totalItems <= PAGE_SIZE_STEP) {
    return [];
  }

  const options: number[] = [];

  for (
    let option = PAGE_SIZE_STEP;
    option < totalItems;
    option += PAGE_SIZE_STEP
  ) {
    options.push(option);
  }

  options.push(totalItems);

  return options;
}

export function PaginationNav({
  ariaLabel,
  baseHref,
  limit,
  page,
  placement,
  totalItems,
  totalPages,
}: Readonly<{
  ariaLabel: string;
  baseHref: string;
  limit: number;
  page: number;
  placement: "top" | "bottom";
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
            href={`${baseHref}?page=${page - 1}&limit=${limit}`}
          >
            Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            className="text-link"
            href={`${baseHref}?page=${page + 1}&limit=${limit}`}
          >
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
