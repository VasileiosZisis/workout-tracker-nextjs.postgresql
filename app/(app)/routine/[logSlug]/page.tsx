import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { BackLink } from "@/components/back-link";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { getWorkoutPanel } from "@/features/workouts/queries";
import { RoutineSetup } from "@/features/workouts/components/routine-setup";

export const metadata: Metadata = { title: "Routine" };

export default async function RoutineOverviewPage({ params }: {
  params: Promise<{ logSlug: string }>;
}) {
  const user = await requireUser();
  const { logSlug } = await params;
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });
  if (!log) notFound();
  const routine = await getWorkoutPanel(user.id, log.id);
  const logHref = `/logs/${log.slug}`;

  if (!routine) {
    return (
      <main className="page">
        <BackLink href="/routine">Routine</BackLink>
        <section className="page-header compact-header">
          <h1>{log.title} routine</h1>
          <p>Create an optional workout routine for this log.</p>
        </section>
        <RoutineSetup key={`${user.id}:${log.id}`} userId={user.id} logId={log.id} logSlug={log.slug} requestId={randomUUID()} />
      </main>
    );
  }

  const { active, schedule, definitions } = routine;
  const style = schedule?.style ?? "CONTINUOUS";
  const scheduleLabel = style === "WEEKLY" ? "Restart each week"
    : style === "FIXED" ? "Train on specific weekdays"
    : "Continue where I left off";
  const nextName = style === "CONTINUOUS"
    ? definitions.find((workout) => workout.id === routine.nextId)?.name
    : schedule?.next?.name;

  return (
    <main className="page">
      <BackLink href="/routine">Routine</BackLink>
      <section className="page-header compact-header">
        <h1>{routine.name}</h1>
        <div className="actions">
          <Link className="button-secondary" href={`${logHref}/workouts`}>Workout history</Link>
          <Link className="button" href={`/routine/${log.slug}/edit`}>Edit routine</Link>
        </div>
      </section>

      <section className="section-block" aria-labelledby="routine-schedule">
        <div className="section-heading"><h2 id="routine-schedule">Schedule</h2></div>
        <Link className="list-item session-card workout-summary-row" href={logHref}>
          <div>
            <h2>{scheduleLabel}</h2>
            {active ? <p>{active.name} is in progress</p> : (
              <p>
                {nextName ? `Next workout · ${nextName}`
                  : schedule?.nextDate ? `Next scheduled date · ${schedule.nextDate}`
                  : style === "WEEKLY" ? "Week complete" : "No workout queued"}
              </p>
            )}
            {schedule?.pending && <p className="field-help">Schedule change pending for {schedule.pending.date}.</p>}
          </div>
        </Link>
      </section>

      <section className="section-block" aria-labelledby="routine-workouts">
        <div className="section-heading"><h2 id="routine-workouts">Workouts</h2></div>
        <div className="routine-workouts-panel">
          <table className="data-table routine-workouts-table" aria-labelledby="routine-workouts">
            <thead>
              <tr className="chart-session-row">
                <th scope="col">Workout</th>
                <th scope="col">Exercises</th>
              </tr>
            </thead>
            <tbody>
              {definitions.map((definition) => (
                <tr key={definition.id}>
                  <th scope="row">{definition.name}</th>
                  <td>
                    {definition.exercises.length === 0 ? "No exercises assigned" : (
                      <ul className="routine-exercise-list" role="list">
                        {definition.exercises.map(({ id, exercise }) => (
                          <li key={id}>{exercise.title}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
