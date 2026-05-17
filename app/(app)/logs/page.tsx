import type { Metadata } from "next";
import Link from "next/link";
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
        <p className="eyebrow">Training evidence</p>
        <h1>Logs</h1>
        <p className="lede">Group sessions by plan, phase, or measurable goal.</p>
        <div className="actions">
          <Link className="button" href="/logs/new">
            Create log
          </Link>
        </div>
      </section>

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
            <article className="list-item session-card" key={log.id}>
              <div>
                <h2>
                  <Link href={`/logs/${log.slug}`}>{log.title}</Link>
                </h2>
                <p>Updated {log.updatedAt.toLocaleDateString()}</p>
              </div>
              <Link className="text-link" href={`/logs/${log.slug}/edit`}>
                Edit
              </Link>
            </article>
          ))}
        </section>
      )}

      <nav className="pagination" aria-label="Pagination">
        <span>
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <div>
          {pagination.page > 1 ? (
            <Link
              className="text-link"
              href={`/logs?page=${pagination.page - 1}&limit=${pagination.limit}`}
            >
              Previous
            </Link>
          ) : null}
          {pagination.page < pagination.totalPages ? (
            <Link
              className="text-link"
              href={`/logs?page=${pagination.page + 1}&limit=${pagination.limit}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      </nav>
    </main>
  );
}
