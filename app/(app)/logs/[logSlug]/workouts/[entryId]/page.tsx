import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { PaginationNav } from "@/components/pagination-nav";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { parsePagination } from "@/features/logs/pagination";
import { getWorkoutHistoryDetail } from "@/features/workouts/history-queries";
import { formatSessionDate } from "@/features/weightlifting/format";

export const metadata: Metadata = { title: "Workout details" };

export default async function WorkoutHistoryDetailPage({ params, searchParams }: {
  params: Promise<{ logSlug: string; entryId: string }>;
  searchParams: Promise<{ page?: string | string[]; limit?: string | string[] }>;
}) {
  const user = await requireUser();
  const { logSlug, entryId } = await params;
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });
  if (!log) notFound();
  const input = parsePagination(await searchParams);
  const result = await getWorkoutHistoryDetail(user.id, log.id, entryId, input.page, input.limit);
  if (!result) notFound();
  const { entry, sessions, pagination } = result;
  const baseHref = `/logs/${log.slug}/workouts/${entry.id}`;
  return <main className="page">
    <BackLink href={`/logs/${log.slug}/workouts`}>Workout history</BackLink>
    <section className="page-header compact-header"><h1>{entry.name}</h1><p>{formatSessionDate(entry.performedAt)} · {entry.status === "IN_PROGRESS" ? "In progress" : "Completed"}</p></section>
    {entry.scheduledDate ? <p>Planned: {entry.plannedName} · {formatSessionDate(entry.scheduledDate)}{entry.schedulingIntent === "MAKEUP" ? " · Make-up workout" : ""}</p> : entry.plannedName && entry.plannedName !== entry.name ? <p>Planned: {entry.plannedName} · Substitution</p> : null}
    {entry.status === "IN_PROGRESS" ? <Link href={`/logs/${log.slug}`}>Continue workout</Link> : null}
    <PaginationNav ariaLabel="Workout session pagination" baseHref={baseHref} {...pagination} placement="top" />
    {sessions.length ? <section className="list section-block evidence-list" aria-label="Recorded sessions">
      {sessions.map((session) => <Link className="list-item session-card" key={session.id} href={`/logs/${log.slug}/exercises/${session.exercise.slug}/weightlifting/${session.id}`}>
        <div><h2>{session.exercise.title}</h2><p>View session or change its workout assignment</p></div>
      </Link>)}
    </section> : <section className="empty-state section-block"><h2>No recorded sessions</h2><p>{entry.status === "COMPLETED" ? "This completed workout is kept in your history." : "Record a session before finishing this workout."}</p></section>}
    <PaginationNav ariaLabel="Workout session pagination" baseHref={baseHref} {...pagination} placement="bottom" />
    <p>To add a standalone session, open its session details and choose Change workout.</p>
    <Link href={`/logs/${log.slug}`}>Go to log</Link>
  </main>;
}
