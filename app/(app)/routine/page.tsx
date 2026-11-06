import type { Metadata } from "next";
import Link from "next/link";
import { PaginationNav } from "@/components/pagination-nav";
import { requireUser } from "@/lib/auth";
import { parsePagination } from "@/features/logs/pagination";
import { getLogsPage } from "@/features/logs/queries";
import { getRoutineNamesForLogs } from "@/features/workouts/queries";

export const metadata: Metadata = { title: "Routine" };

export default async function RoutinePage({ searchParams }: {
  searchParams: Promise<{ page?: string; limit?: string }>;
}) {
  const user = await requireUser();
  const { logs, pagination } = await getLogsPage({
    userId: user.id,
    ...parsePagination(await searchParams),
  });
  const routineNames = await getRoutineNamesForLogs(user.id, logs.map((log) => log.id));

  return <main className="page">
    <section className="page-header">
      <h1>Routine</h1>
      <p>Choose a log to create or configure its workout routine.</p>
    </section>
    {logs.length === 0 ? <section className="empty-state section-block">
      <div><h2>No logs yet</h2><p>Create a log to set up a workout routine.</p></div>
      <Link className="button" href="/logs/new">Create log</Link>
    </section> : <>
      <PaginationNav ariaLabel="Routine log pagination" baseHref="/routine" {...pagination} placement="top" />
      <section className="list section-block evidence-list" aria-label="Logs for routine setup">
        {logs.map((log) => {
          const routineName = routineNames.get(log.id);
          return (
            <Link className="list-item session-card" href={`/routine/${log.slug}`} key={log.id}>
              <div>
                <h2>{routineName ?? log.title}</h2>
                <p>{routineName === undefined ? "Configure workout routine" : log.title}</p>
              </div>
            </Link>
          );
        })}
      </section>
      <PaginationNav ariaLabel="Routine log pagination" baseHref="/routine" {...pagination} placement="bottom" />
    </>}
  </main>;
}
