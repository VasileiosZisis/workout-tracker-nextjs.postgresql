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
          <Link className="button-secondary" href={logHref}>{log.title}</Link>
          <Link className="button-secondary" href={`${logHref}/workouts`}>Workout history</Link>
          {!active && <Link className="button" href={`/routine/${log.slug}/edit`}>Edit routine</Link>}
        </div>
      </section>

      <section className="section-block" aria-labelledby="routine-schedule">
        <div className="section-heading"><h2 id="routine-schedule">Schedule</h2></div>
        <div className="list-item session-card routine-workout-row">
          <div>
            <h2>{scheduleLabel}</h2>
            {!active && (nextName ? (
              <p>{`Next workout · ${nextName}`}</p>
            ) : (
              <div className="session-metrics">
                <span className="metric-pill">
                  {schedule?.nextDate ? `Next scheduled date · ${schedule.nextDate}`
                    : style === "WEEKLY" ? "Week complete" : "No workout queued"}
                </span>
              </div>
            ))}
            {active && <p>{active.name} is in progress</p>}
            {schedule?.pending && <p className="field-help">Schedule change pending for {schedule.pending.date}.</p>}
          </div>
          {active && (
            <Link className="button" href={`${logHref}/workouts/${active.slug}`}>Continue workout</Link>
          )}
        </div>
      </section>

      <section className="section-block" aria-labelledby="routine-workouts">
        <div className="section-heading"><h2 id="routine-workouts">Workouts</h2></div>
        <div className="list evidence-list">
          {definitions.map((definition) => (
              <article className="list-item session-card routine-workout-row" key={definition.id}>
                <div>
                  <h2>{definition.name}</h2>
                  {definition.exercises.length > 0 && (
                    <div className="session-metrics">
                      {definition.exercises.map(({ id, exercise }) => (
                        <span className="metric-pill" key={id}>{exercise.title}</span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
          ))}
        </div>
      </section>
    </main>
  );
}
