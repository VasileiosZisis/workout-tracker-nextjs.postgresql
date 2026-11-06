import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { PerformedDateInput } from "@/components/performed-date-input";
import { PaginationNav } from "@/components/pagination-nav";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { parsePagination } from "@/features/logs/pagination";
import { getHistoryRoutine, getStandaloneSessionPage } from "@/features/workouts/history-queries";
import { performedDateSchema } from "@/features/workouts/schema";
import { HistoricalGroupForm } from "@/features/workouts/components/history-forms";
import { getScheduleWeek } from "@/features/workouts/schedule-queries";
import { addDays } from "@/features/workouts/calendar";

export const metadata: Metadata = { title: "Group existing sessions" };

export default async function GroupHistoricalWorkoutPage({ params, searchParams }: {
  params: Promise<{ logSlug: string }>;
  searchParams: Promise<{ performedDate?: string | string[]; page?: string | string[]; limit?: string | string[]; slotWeek?: string; slotPage?: string }>;
}) {
  const user = await requireUser();
  const { logSlug } = await params;
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });
  if (!log) notFound();
  const search = await searchParams;
  const date = search.performedDate === undefined ? undefined : performedDateSchema.safeParse(search.performedDate);
  if (date && !date.success) notFound();
  const performedDate = date?.success ? date.data : undefined;
  const routine = await getHistoryRoutine(user.id, log.id);
  const input = parsePagination(search);
  const result = routine && performedDate ? await getStandaloneSessionPage(user.id, log.id, performedDate, input.page, input.limit) : null;
  const slotDate = performedDateSchema.safeParse(search.slotWeek ?? performedDate);
  if (search.slotWeek && !slotDate.success) notFound();
  const scheduleRows = routine && performedDate && slotDate.success ? await getScheduleWeek(user.id, log.id, slotDate.data, Math.max(1, Number(search.slotPage) || 1)) : null;
  const eligible = scheduleRows?.rows.filter((slot) => ["PENDING", "MISSED", "SKIPPED"].includes(slot.outcome) && performedDate! >= slot.date && performedDate! <= slot.today && (slot.outcome !== "PENDING" || (performedDate! < slot.expires && (slot.style !== "FIXED" || performedDate === slot.date)))) ?? [];
  const baseHref = `/logs/${log.slug}/workouts/new`;
  return <main className="page">
    <BackLink href={`/logs/${log.slug}/workouts`}>Workout history</BackLink>
    <section className="page-header"><h1>Group existing sessions</h1></section>
    {!routine ? <section className="empty-state section-block"><p>Create a routine for this log first.</p><Link className="button" href={`/routine/${log.slug}`}>Configure routine</Link></section> : <>
      <form method="get" action={baseHref} className="section-block form-stack narrow">
        <div className="field"><label htmlFor="performedDate">Performed date</label><PerformedDateInput key={performedDate ?? "today"} defaultValue={performedDate} /></div>
        <div className="form-actions"><button className="button-secondary">Show standalone sessions</button></div>
      </form>
      {result && performedDate ? <section className="section-block narrow">
        {slotDate.success ? <nav className="form-actions" aria-label="Scheduled slots for grouping"><Link href={`${baseHref}?performedDate=${performedDate}&slotWeek=${addDays(slotDate.data, -7)}`}>Earlier slots</Link><span>Slots in week of {slotDate.data}</span><Link href={`${baseHref}?performedDate=${performedDate}&slotWeek=${addDays(slotDate.data, 7)}`}>Later slots</Link></nav> : null}
        {scheduleRows && scheduleRows.pagination.totalPages > 1 && slotDate.success ? <nav className="form-actions" aria-label="Slot version pages">{scheduleRows.pagination.page > 1 ? <Link href={`${baseHref}?performedDate=${performedDate}&slotWeek=${slotDate.data}&slotPage=${scheduleRows.pagination.page - 1}`}>Previous schedule versions</Link> : null}{scheduleRows.pagination.page < scheduleRows.pagination.totalPages ? <Link href={`${baseHref}?performedDate=${performedDate}&slotWeek=${slotDate.data}&slotPage=${scheduleRows.pagination.page + 1}`}>More schedule versions</Link> : null}</nav> : null}
        <PaginationNav ariaLabel="Standalone session pagination" baseHref={baseHref} preservedParams={{ performedDate }} {...result.pagination} placement="top" />
        {result.sessions.length ? <HistoricalGroupForm key={`${performedDate}:${routine.revision}:${result.pagination.page}:${result.pagination.limit}:${search.slotWeek}:${search.slotPage}`} logId={log.id} logSlug={log.slug} routine={routine} date={performedDate} requestId={randomUUID()} sessions={result.sessions} slots={eligible} /> : <p>No standalone sessions on this date.</p>}
        <PaginationNav ariaLabel="Standalone session pagination" baseHref={baseHref} preservedParams={{ performedDate }} {...result.pagination} placement="bottom" />
      </section> : null}
    </>}
  </main>;
}
