"use client";

import Link from "next/link";
import { useActionState, useSyncExternalStore } from "react";
import { formatLocalDate } from "@/lib/local-date";
import { startWorkoutFromViewAction } from "../view-actions";
import type { getWorkoutSummary } from "../queries";
import type { WorkoutActionState } from "../schema";

const subscribe = () => () => {};
export function WorkoutSummary({ logId, logSlug, routine, requestId }: {
  logId: string; logSlug: string; routine: Awaited<ReturnType<typeof getWorkoutSummary>>; requestId: string;
}) {
  const [state, action, pending] = useActionState(startWorkoutFromViewAction, {} as WorkoutActionState);
  const browserDate = useSyncExternalStore(subscribe, () => formatLocalDate(new Date()), () => "");
  if (!routine) return null;
  const schedule = routine.schedule;
  const continuous = !schedule || schedule.style === "CONTINUOUS";
  const next = schedule?.next;
  const canStart = continuous ? !!routine.nextId : !!next;
  const date = schedule?.id ? schedule.today : browserDate;
  const active = routine.active;
  const status = schedule?.style === "WEEKLY" ? "Week complete" : schedule?.choices.some((slot) => slot.date === schedule.today && slot.outcome === "COMPLETED") ? "Today's workout complete" : schedule?.choices.some((slot) => slot.date === schedule.today && slot.outcome === "SKIPPED") ? "Today's workout skipped" : "Rest day";
  return <section className="section-block" aria-label="Current workout">
    <div className="list-item session-card routine-workout-row workout-summary-row">
      <div><h2>{active ? `Current workout: ${active.name}` : canStart ? `Next workout: ${continuous ? routine.nextName : next?.name}` : status}</h2>
        <p>{routine.name}</p>
      </div>
      {active ? <Link className="button" href={`/logs/${logSlug}/workouts/${active.slug}`}>Continue</Link> : canStart ? <form action={action}>
        <input type="hidden" name="logId" value={logId} /><input type="hidden" name="routineId" value={routine.id} />
        <input type="hidden" name="revision" value={routine.revision} /><input type="hidden" name="nextId" value={routine.nextId} />
        <input type="hidden" name="requestId" value={requestId} /><input type="hidden" name="performedDate" value={date} />
        <input type="hidden" name="schedulingIntent" value={continuous ? "ROTATION" : "SCHEDULED"} />
        <input type="hidden" name="scheduleId" value={schedule?.id ?? ""} /><input type="hidden" name="slotKey" value={next?.key ?? ""} />
        <input type="hidden" name="chosenDefinitionId" value={continuous ? routine.nextId : next?.definitionId ?? ""} /><input type="hidden" name="scheduleToday" value={schedule?.today ?? browserDate} />
        <button className="button" disabled={pending || !date}>{pending ? "Starting…" : "Start"}</button>
      </form> : <Link className="button-secondary" href={`/logs/${logSlug}/workouts/start`}>Choose workout</Link>}
    </div>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
  </section>;
}
