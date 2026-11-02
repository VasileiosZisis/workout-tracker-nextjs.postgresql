import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { PaginationNav } from "@/components/pagination-nav";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { parsePagination } from "@/features/logs/pagination";
import { getWorkoutHistoryPage } from "@/features/workouts/history-queries";
import { formatSessionDate } from "@/features/weightlifting/format";

export const metadata: Metadata = { title: "Workout history" };

export default async function WorkoutHistoryPage({ params, searchParams }: {
  params: Promise<{ logSlug: string }>;
  searchParams: Promise<{ page?: string | string[]; limit?: string | string[] }>;
}) {
  const user = await requireUser();
  const { logSlug } = await params;
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });
  if (!log) notFound();
  const input = parsePagination(await searchParams);
  const { entries, pagination } = await getWorkoutHistoryPage(user.id, log.id, input.page, input.limit);
  const baseHref = `/logs/${log.slug}/workouts`;
  return <main className="page">
    <BackLink href={`/logs/${log.slug}`}>{log.title}</BackLink>
    <section className="page-header"><h1>Workout history</h1>
      <Link className="button" href={`${baseHref}/new`}>Group existing sessions</Link>
      <Link className="button-secondary" href={`${baseHref}/schedule`}>Schedule outcomes</Link>
    </section>
    <PaginationNav ariaLabel="Workout history pagination" baseHref={baseHref} {...pagination} placement="top" />
    {entries.length ? <section className="list section-block evidence-list" aria-label="Completed workouts">
      {entries.map((entry) => <Link key={entry.id} className="list-item session-card" href={`${baseHref}/${entry.id}`}>
        <div><h2>{entry.name}</h2><p>{formatSessionDate(entry.performedAt)} · {entry._count.sessions ? `${entry._count.sessions} recorded sessions` : "No recorded sessions"}</p></div>
      </Link>)}
    </section> : <section className="empty-state section-block"><h2>No completed workouts yet</h2><p>Finish a workout or group existing standalone sessions to see it here.</p></section>}
    <PaginationNav ariaLabel="Workout history pagination" baseHref={baseHref} {...pagination} placement="bottom" />
  </main>;
}
