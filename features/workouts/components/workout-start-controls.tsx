"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PerformedDateInput } from "@/components/performed-date-input";
import { workoutAction } from "../actions";
import type { WorkoutActionState } from "../schema";
import type { ScheduleContext } from "../schedule-queries";
import { startWorkoutFromViewAction } from "../view-actions";

export function WorkoutStartControls({ logId, logSlug, routineId, revision, nextId, definitions, schedule, requestId, makeup }: {
  logId: string; logSlug: string; routineId: string; revision: number; nextId: string; definitions: { id: string; name: string }[];
  schedule: ScheduleContext | null; requestId: string;
  makeup?: { scheduleId: string; key: string; name: string; definitionId: string; today: string };
}) {
  const [state, action, controlPending] = useActionState(workoutAction, {} as WorkoutActionState);
  const [startState, startAction, startPending] = useActionState(startWorkoutFromViewAction, {} as WorkoutActionState);
  const pending = controlPending || startPending;
  const continuous = !schedule || schedule.style === "CONTINUOUS";
  const suggested = makeup?.definitionId ?? schedule?.next?.definitionId ?? nextId;
  const [extra, setExtra] = useState(false);
  const [definitionId, setDefinitionId] = useState(suggested);
  const intent = makeup ? "MAKEUP" : extra ? "EXTRA" : continuous ? "ROTATION" : "SCHEDULED";
  const hasNext = !!makeup || continuous || !!schedule?.next;
  return <div className="form-stack">
    {!makeup ? <>
      <p>{continuous ? "Continuous rotation" : schedule.style === "WEEKLY" ? "Weekly sequence" : "Fixed weekdays"} · {schedule?.today} ({schedule?.timezone ?? "UTC"})</p>
      {hasNext ? <p>Up next: <strong>{continuous ? definitions.find((item) => item.id === nextId)?.name : schedule?.next?.name}</strong></p> : <p>{schedule?.style === "WEEKLY" ? "Week complete" : schedule?.choices.some((slot) => slot.date === schedule.today && slot.outcome === "COMPLETED") ? "Today's workout is complete" : schedule?.choices.some((slot) => slot.date === schedule.today && slot.outcome === "SKIPPED") ? "Today's workout was skipped" : `Rest day${schedule?.nextDate ? ` · Next scheduled date: ${schedule.nextDate} (${schedule.nextDateTimezone})` : ""}`}</p>}
      <label className="checkbox-row"><input type="checkbox" checked={extra} onChange={(event) => { setExtra(event.target.checked); setDefinitionId(event.target.checked ? definitions[0]?.id ?? "" : suggested); }} />Extra workout — leave the schedule unchanged</label>
    </> : <p>Make up {makeup.name}</p>}
    {hasNext || extra ? <form action={startAction} className="form-stack">
      <input type="hidden" name="operation" value="start" /><input type="hidden" name="logId" value={logId} /><input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="revision" value={revision} /><input type="hidden" name="nextId" value={nextId} /><input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="schedulingIntent" value={intent} /><input type="hidden" name="scheduleId" value={makeup?.scheduleId ?? schedule?.id ?? ""} />
      <input type="hidden" name="slotKey" value={makeup?.key ?? schedule?.next?.key ?? ""} /><input type="hidden" name="scheduleToday" value={schedule?.today ?? ""} />
      <label className="field">{extra ? "Extra workout" : "Choose another workout (optional)"}<select name="chosenDefinitionId" value={definitionId} onChange={(event) => setDefinitionId(event.target.value)} required>
        {!definitions.some((item) => item.id === suggested) ? <option value={suggested}>{makeup?.name ?? schedule?.next?.name}</option> : null}
        {definitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label className="field">Performed date<PerformedDateInput defaultValue={makeup?.today ?? (schedule?.id ? schedule.today : undefined)} /></label>
      <button className="button" disabled={pending}>Start workout</button>
    </form> : null}
    {!makeup ? <>
      {hasNext ? controlForm("skip", "Skip workout") : null}
      <Link href={`/logs/${logSlug}/workouts/schedule`}>Schedule outcomes and make-up workouts</Link>
    </> : null}
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
    {startState.error ? <p className="form-error" role="alert">{startState.error}</p> : null}
  </div>;

  function controlForm(operation: string, label: string) {
    return <form action={action}>
      <input type="hidden" name="operation" value={operation} /><input type="hidden" name="logId" value={logId} /><input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="revision" value={revision} /><input type="hidden" name="nextId" value={nextId} /><input type="hidden" name="requestId" value={`${requestId}`} />
      <input type="hidden" name="scheduleId" value={schedule?.id ?? ""} /><input type="hidden" name="slotKey" value={schedule?.next?.key ?? ""} /><input type="hidden" name="scheduleToday" value={schedule?.today ?? ""} />
      <button className="button-secondary" disabled={pending}>{label}</button>
    </form>;
  }
}
