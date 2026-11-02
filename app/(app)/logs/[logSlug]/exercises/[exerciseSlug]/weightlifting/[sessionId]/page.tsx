import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { requireUser } from "@/lib/auth";
import { SessionSummary } from "@/features/weightlifting/components/session-summary";
import { formatSessionDate } from "@/features/weightlifting/format";
import { getWeightliftingSessionById } from "@/features/weightlifting/queries";
import { PaginationNav } from "@/components/pagination-nav";
import { parsePagination } from "@/features/logs/pagination";
import { getHistoryRoutine, getSessionWorkoutCandidates } from "@/features/workouts/history-queries";
import { ReassignWorkoutForm } from "@/features/workouts/components/history-forms";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const user = await requireUser();
  const { sessionId } = await params;
  const session = await getWeightliftingSessionById({
    userId: user.id,
    sessionId,
  });

  return {
    title: session
      ? `${session.exercise.title} ${formatSessionDate(session.performedAt)}`
      : "Weightlifting Session",
  };
}

export default async function WeightliftingSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ logSlug: string; exerciseSlug: string; sessionId: string }>;
  searchParams: Promise<{ page?: string | string[]; limit?: string | string[] }>;
}) {
  const user = await requireUser();
  const { sessionId, logSlug, exerciseSlug } = await params;
  const session = await getWeightliftingSessionById({
    userId: user.id,
    sessionId,
  });

  if (!session || session.exercise.log.slug !== logSlug || session.exercise.slug !== exerciseSlug) {
    notFound();
  }

  const exercisePath = `/logs/${session.exercise.log.slug}/exercises/${session.exercise.slug}`;
  const input = parsePagination(await searchParams);
  const routine = await getHistoryRoutine(user.id, session.logId);
  const choices = routine ? await getSessionWorkoutCandidates(user.id, session.logId, session.performedAt, session.workoutEntryId, input.page, input.limit) : null;

  return (
    <main className="page">
      <BackLink href={exercisePath}>Weightlifting session</BackLink>
      <section className="page-header compact-header">
        <h1>{formatSessionDate(session.performedAt)}</h1>
        <div className="actions">
          <Link
            className="button-secondary"
            href={`${exercisePath}/weightlifting/${session.id}/edit`}
          >
            Edit session
          </Link>
        </div>
      </section>
      <section className="section-block">
        {session.workoutEntry ? <p>Workout: <Link href={`/logs/${session.exercise.log.slug}/workouts/${session.workoutEntry.id}`}>{session.workoutEntry.name} · {formatSessionDate(session.workoutEntry.performedAt)}</Link></p> : null}
        <SessionSummary session={session} />
      </section>
      {routine && choices ? <details className="section-block form-panel workout-panel">
        <summary>Change workout</summary>
        <ReassignWorkoutForm key={`${session.updatedAt.toISOString()}:${choices.pagination.page}:${choices.pagination.limit}`} logId={session.logId} logSlug={session.exercise.log.slug} routineId={routine.id}
          session={{ id: session.id, updatedAt: session.updatedAt.toISOString(), current: session.workoutEntry ? { id: session.workoutEntry.id, name: session.workoutEntry.name } : null }} candidates={choices.entries} />
        <PaginationNav ariaLabel="Workout assignment pagination" baseHref={`${exercisePath}/weightlifting/${session.id}`} {...choices.pagination} placement="bottom" />
      </details> : null}
    </main>
  );
}
