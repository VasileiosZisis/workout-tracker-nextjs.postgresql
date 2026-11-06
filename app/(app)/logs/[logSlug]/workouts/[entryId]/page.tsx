import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { PaginationNav } from "@/components/pagination-nav";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { parsePagination } from "@/features/logs/pagination";
import { getWorkoutHistoryDetail } from "@/features/workouts/history-queries";
import { formatSessionDate } from "@/features/weightlifting/format";
import { getActiveWorkoutDetail } from "@/features/workouts/queries";
import { ActiveWorkout } from "@/features/workouts/components/active-workout";

export const metadata: Metadata = { title: "Workout details" };

export default async function WorkoutHistoryDetailPage({ params, searchParams }: {
  params: Promise<{ logSlug: string; entryId: string }>;
  searchParams: Promise<{ page?: string | string[]; limit?: string | string[] }>;
}) {
  const user = await requireUser();
  const { logSlug, entryId: entryKey } = await params;
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });
  if (!log) notFound();
  const query = await searchParams;
  const input = parsePagination(query);
  const result = await getWorkoutHistoryDetail(user.id, log.id, entryKey, input.page, input.limit);
  if (!result) notFound();
  const { entry, sessions, pagination } = result;
  const baseHref = `/logs/${log.slug}/workouts/${entry.slug}`;
  if (entryKey !== entry.slug) {
    const paginationQuery = new URLSearchParams();
    if (query.page !== undefined) paginationQuery.set("page", String(input.page));
    if (query.limit !== undefined) paginationQuery.set("limit", String(input.limit));
    permanentRedirect(paginationQuery.size ? `${baseHref}?${paginationQuery}` : baseHref);
  }
  const active = entry.status === "IN_PROGRESS" ? await getActiveWorkoutDetail(user.id, log.id, entry.id) : null;
  if (entry.status === "IN_PROGRESS" && !active) notFound();
  const performedDate = formatSessionDate(entry.performedAt);
  return <main className="page workout-detail-page">
    <BackLink href={active ? `/logs/${log.slug}` : `/logs/${log.slug}/workouts`}>{active ? log.title : "Workout history"}</BackLink>
    <section className="page-header compact-header">
      <h1>{entry.name}</h1>
      {active ? (
        <h2 className="session-reference-date"><time dateTime={performedDate}>{performedDate}</time></h2>
      ) : <p>{performedDate} · Completed</p>}
      {entry.scheduledDate ? <p>Planned: {entry.plannedName} · {formatSessionDate(entry.scheduledDate)}{entry.schedulingIntent === "MAKEUP" ? " · Make-up workout" : ""}</p> : entry.plannedName && entry.plannedName !== entry.name ? <p>Planned: {entry.plannedName} · Substitution</p> : null}
    </section>
    {active ? <ActiveWorkout logId={log.id} logSlug={log.slug} entry={active} /> : <>
    <PaginationNav ariaLabel="Workout session pagination" baseHref={baseHref} {...pagination} placement="top" />
    {sessions.length ? <section className="section-block" aria-labelledby="recorded-sessions">
      <div className="section-heading"><h2 id="recorded-sessions">Recorded sessions</h2></div>
      <div className="list evidence-list">
      {sessions.map((session) => <Link className="list-item session-card" key={session.id} href={`/logs/${log.slug}/exercises/${session.exercise.slug}/weightlifting/${session.id}`}>
        <div className="workout-exercise-info"><h3>{session.exercise.title}</h3><p>View session or change its workout assignment</p></div>
      </Link>)}
      </div>
    </section> : <section className="empty-state section-block"><h2>No recorded sessions</h2><p>{entry.status === "COMPLETED" ? "This completed workout is kept in your history." : "Record a session before finishing this workout."}</p></section>}
    <PaginationNav ariaLabel="Workout session pagination" baseHref={baseHref} {...pagination} placement="bottom" />
    <div className="section-block form-actions">
      <p className="field-help">To add a standalone session, open its session details and choose Change workout.</p>
      <Link className="button-secondary" href={`/logs/${log.slug}`}>Go to log</Link>
    </div>
    </>}
  </main>;
}
