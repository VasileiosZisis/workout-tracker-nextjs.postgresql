import type { Metadata } from "next";
import Link from "next/link";
import { PaginationNav } from "@/components/pagination-nav";
import { requireUser } from "@/lib/auth";
import { getLogsPage } from "@/features/logs/queries";
import { parsePagination } from "@/features/logs/pagination";

export const metadata: Metadata = {
  title: "Logs",
};

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  const user = await requireUser();
  const paginationInput = parsePagination(await searchParams);
  const { logs, pagination } = await getLogsPage({
    userId: user.id,
    ...paginationInput,
  });

  return (
    <main className="page">
      <section className="page-header">
        <h1>Logs</h1>
        <div className="actions">
          <Link className="button" href="/logs/new">
            Create log
          </Link>
        </div>
      </section>

      <PaginationNav
        ariaLabel="Log pagination"
        baseHref="/logs"
        limit={pagination.limit}
        page={pagination.page}
        placement="top"
        totalItems={pagination.totalItems}
        totalPages={pagination.totalPages}
      />

      {logs.length === 0 ? (
        <section className="empty-state section-block">
          <div>
            <h2>No logs yet</h2>
            <p>Create the first place to collect training evidence.</p>
          </div>
          <Link className="button" href="/logs/new">
            Create log
          </Link>
        </section>
      ) : (
        <section className="list section-block evidence-list" aria-label="Logs">
          {logs.map((log) => (
            <Link
              className="list-item session-card"
              href={`/logs/${log.slug}`}
              key={log.id}
            >
              <div>
                <h2>{log.title}</h2>
                <p>Updated {log.updatedAt.toLocaleDateString()}</p>
              </div>
            </Link>
          ))}
        </section>
      )}

      <PaginationNav
        ariaLabel="Log pagination"
        baseHref="/logs"
        limit={pagination.limit}
        page={pagination.page}
        placement="bottom"
        totalItems={pagination.totalItems}
        totalPages={pagination.totalPages}
      />
    </main>
  );
}
