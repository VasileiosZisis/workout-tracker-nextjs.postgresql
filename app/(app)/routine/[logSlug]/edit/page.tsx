import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { BackLink } from "@/components/back-link";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { getWorkoutPanel } from "@/features/workouts/queries";
import { RoutineSettings } from "@/features/workouts/components/workout-panel";
import { AssignmentEditor } from "@/features/workouts/components/assignment-editor";
import { ScheduleSettings } from "@/features/workouts/components/schedule-settings";
import { RoutineReset } from "@/features/workouts/components/routine-reset";
import { DeleteRoutineForm } from "@/features/workouts/components/delete-routine-form";
import { RoutineEditSections, RoutineEditSteps } from "@/features/workouts/components/routine-edit-sections";

export const metadata: Metadata = { title: "Edit routine" };

export default async function EditRoutinePage({ params }: {
  params: Promise<{ logSlug: string }>;
}) {
  const user = await requireUser();
  const { logSlug } = await params;
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });
  if (!log) notFound();
  const routineHref = `/routine/${log.slug}`;
  const routine = await getWorkoutPanel(user.id, log.id);
  if (!routine) redirect(routineHref);
  const formVersion = `${routine.revision}:${routine.schedule?.id}:${routine.schedule?.today}`;
  // Exercise saves bump the routine revision too. Reset each form only when its own saved inputs change.
  const workoutsVersion = JSON.stringify([
    routine.name,
    routine.nextId,
    routine.definitions.map(({ id, name }) => [id, name]),
  ]);
  const scheduleVersion = JSON.stringify([
    routine.schedule?.id,
    routine.schedule?.pending?.id,
    routine.definitions.map(({ id }) => id),
  ]);

  return (
    <main className="page">
      <BackLink href={routineHref}>Routine overview</BackLink>
      <section className="page-header compact-header">
        <h1>Edit {routine.name}</h1>
      </section>

      {routine.active ? (
        <section className="section-block narrow form-panel form-stack">
          <p>{routine.active.name} is in progress</p>
          <div className="actions">
            <Link className="button" href={`/logs/${log.slug}/workouts/${routine.active.slug}`}>Continue workout</Link>
          </div>
        </section>
      ) : (
        <>
          <RoutineEditSections
            key={routine.id}
            workouts={routine.schedule?.pending ? (
              <div className="form-panel form-stack">
                <RoutineEditSteps />
                <p>Cancel the pending schedule change before editing workout names or order.</p>
              </div>
            ) : (
              <RoutineSettings key={workoutsVersion} logId={log.id} routine={routine} cancelHref={routineHref} />
            )}
            exercises={<AssignmentEditor key={routine.id} logId={log.id} routine={routine} cancelHref={routineHref} />}
            scheduling={<>
              <ScheduleSettings key={`schedule:${scheduleVersion}`} logId={log.id} routineId={routine.id} revision={routine.revision} definitions={routine.definitions} schedule={routine.schedule} cancelHref={routineHref} />
              <RoutineReset key={`reset:${formVersion}`} logId={log.id} routine={routine} requestId={randomUUID()} />
            </>}
          />
          <DeleteRoutineForm key={`${routine.id}:${routine.revision}`} logId={log.id} routineId={routine.id} revision={routine.revision} active={false} />
        </>
      )}
    </main>
  );
}
