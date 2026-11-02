import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { PaginationNav } from "@/components/pagination-nav";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { parsePagination } from "@/features/logs/pagination";
import { getWorkoutPanel } from "@/features/workouts/queries";
import { getScheduleWeek } from "@/features/workouts/schedule-queries";
import { performedDateSchema } from "@/features/workouts/schema";
import { addDays } from "@/features/workouts/calendar";
import { WorkoutStartControls } from "@/features/workouts/components/workout-start-controls";

export const metadata = { title: "Schedule outcomes" };
export default async function ScheduleHistoryPage({ params, searchParams }: {
  params: Promise<{ logSlug: string }>;
  searchParams: Promise<{ week?: string; page?: string; limit?: string; controlPage?: string }>;
}) {
  const user = await requireUser(), { logSlug } = await params;
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });
  if (!log) notFound();
  const routine = await getWorkoutPanel(user.id, log.id);
  const search = await searchParams;
  const date = performedDateSchema.safeParse(search.week ?? routine?.schedule?.today ?? new Date().toISOString().slice(0, 10));
  if (!date.success) notFound();
  const result = await getScheduleWeek(user.id, log.id, date.data, parsePagination(search).page, new Date(), parsePagination({ page: search.controlPage }).page);
  const base = `/logs/${log.slug}/workouts/schedule`;
  return <main className="page">
    <BackLink href={`/logs/${log.slug}/workouts`}>Workout history</BackLink>
    <section className="page-header"><h1>Schedule outcomes</h1><p>Week containing {date.data}. Each schedule uses its saved timezone and first day of week.</p></section>
    <form method="get" className="form-stack narrow"><label className="field">Date in week<input type="date" name="week" defaultValue={date.data} required /></label><button className="button-secondary">Show week</button></form>
    <nav className="form-actions" aria-label="Schedule weeks"><Link href={`${base}?week=${addDays(date.data, -7)}`}>Previous week</Link><Link href={`${base}?week=${addDays(date.data, 7)}`}>Next week</Link></nav>
    <PaginationNav ariaLabel="Schedule version pagination" baseHref={base} preservedParams={{ week: date.data }} {...result.pagination} placement="top" />
    {result.controls.length ? <section aria-label="Rotation changes"><h2>Rotation changes</h2>{result.controls.map((control) => <p key={control.id}>{control.outcomeDate} ({control.timezone}) · {control.operation === "skip" ? `${control.name} · Skipped` : "Rotation reset to first workout"}</p>)}
      <nav className="form-actions" aria-label="Rotation changes pagination">{result.controlPagination.page > 1 ? <Link href={`${base}?week=${date.data}&controlPage=${result.controlPagination.page - 1}`}>Previous rotation changes</Link> : null}{result.controlPagination.page < result.controlPagination.totalPages ? <Link href={`${base}?week=${date.data}&controlPage=${result.controlPagination.page + 1}`}>More rotation changes</Link> : null}</nav>
    </section> : null}
    {result.rows.length ? result.rows.map((slot) => <section className="section-block form-panel narrow" key={`${slot.scheduleId}:${slot.key}`}>
      <h2>{slot.name}</h2><p>{slot.style === "WEEKLY" ? "Week starting" : "Scheduled"}: {slot.date} ({slot.timezone}) · {slot.outcome.replaceAll("_", " ").toLowerCase()}</p>
      {slot.originalOutcome ? <p>Originally {slot.originalOutcome.toLowerCase()} · Made up{slot.entry ? ` on ${slot.entry.performedDate}` : ""}</p> : null}
      {slot.entry ? <><p>Performed: {slot.entry.name} · {slot.entry.performedDate}{slot.entry.name !== slot.name ? " · Substitution" : ""}</p><Link href={`/logs/${log.slug}/workouts/${slot.entry.id}`}>View workout</Link></> : null}
      {routine && !routine.active && (slot.outcome === "MISSED" || slot.outcome === "SKIPPED") ? <details><summary>Make up workout</summary>
        <WorkoutStartControls logId={log.id} logSlug={log.slug} routineId={routine.id} revision={routine.revision} nextId={routine.nextId} definitions={routine.definitions} schedule={routine.schedule} requestId={randomUUID()} makeup={slot} />
      </details> : null}
    </section>) : <p>No scheduled slots in this week. Continuous rotation has no calendar slots.</p>}
    {routine?.active ? <p>Finish or discard the active workout before starting a make-up workout. <Link href={`/logs/${log.slug}`}>Return to log</Link></p> : null}
    <PaginationNav ariaLabel="Schedule version pagination" baseHref={base} preservedParams={{ week: date.data }} {...result.pagination} placement="bottom" />
  </main>;
}
