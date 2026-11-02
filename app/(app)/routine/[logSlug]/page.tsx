import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { getWorkoutPanel } from "@/features/workouts/queries";
import { RoutineSettings } from "@/features/workouts/components/workout-panel";
import { DeleteRoutineForm } from "@/features/workouts/components/delete-routine-form";
import { WorkoutExerciseSettings } from "@/features/workouts/components/workout-exercise-settings";
import { ScheduleSettings } from "@/features/workouts/components/schedule-settings";

export const metadata: Metadata = { title: "Configure routine" };

export default async function RoutineSettingsPage({ params }: {
  params: Promise<{ logSlug: string }>;
}) {
  const user = await requireUser();
  const { logSlug } = await params;
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });
  if (!log) notFound();
  const routine = await getWorkoutPanel(user.id, log.id);

  return <main className="page">
    <BackLink href="/routine">Routine</BackLink>
    <section className="page-header compact-header">
      <h1>{log.title} routine</h1>
      <p>{routine ? "Configure your workout names and order." : "Create an optional workout routine for this log."}</p>
    </section>
    <section className="section-block narrow form-panel workout-panel" aria-label="Routine configuration">
      {routine?.active ? <>
        <h2>{routine.name}</h2>
        <p>{routine.active.name} is in progress on {routine.active.date}. Finish or discard it before editing the routine.</p>
      </> : routine?.schedule?.pending ? <p>Cancel the pending schedule change before editing workout names or order.</p> : <RoutineSettings key={`${routine?.id ?? "new"}:${routine?.revision ?? 0}`} logId={log.id} routine={routine} />}
      <Link className="button-secondary" href={`/logs/${log.slug}`}>Go to log</Link>
    </section>
    {routine && !routine.active ? <ScheduleSettings key={`schedule:${routine.revision}`} logId={log.id} routineId={routine.id} revision={routine.revision} definitions={routine.definitions} schedule={routine.schedule} /> : null}
    {routine && !routine.active ? routine.definitions.map((definition) => <WorkoutExerciseSettings key={`${definition.id}:${routine.revision}`} logId={log.id} routine={routine} definition={definition} />) : null}
    {routine ? <DeleteRoutineForm key={`${routine.id}:${routine.revision}`} logId={log.id} routineId={routine.id} revision={routine.revision} active={Boolean(routine.active)} /> : null}
  </main>;
}
