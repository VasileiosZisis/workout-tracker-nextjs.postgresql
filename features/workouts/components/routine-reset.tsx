"use client";

import { useActionState } from "react";
import { workoutAction } from "../actions";
import type { WorkoutActionState } from "../schema";
import type { WorkoutPanelData } from "../queries";

export function RoutineReset({ logId, routine, requestId }: { logId: string; routine: NonNullable<WorkoutPanelData>; requestId: string }) {
  const [state, action, pending] = useActionState(workoutAction, {} as WorkoutActionState);
  if (routine.active || routine.schedule?.style === "FIXED") return null;
  const weekly = routine.schedule?.style === "WEEKLY";
  return <details className="section-block narrow"><summary>Reset to first workout</summary>
    <p>{weekly ? `The sequence restarts on ${routine.schedule?.nextWeekDate}. This week's progress stays unchanged.` : "Make the first workout next without changing recorded training."}</p>
    <form action={action} className="form-stack">
      <input type="hidden" name="operation" value="reset" /><input type="hidden" name="logId" value={logId} /><input type="hidden" name="routineId" value={routine.id} />
      <input type="hidden" name="revision" value={routine.revision} /><input type="hidden" name="nextId" value={routine.nextId} /><input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="scheduleId" value={routine.schedule?.id ?? ""} /><input type="hidden" name="slotKey" value="" /><input type="hidden" name="scheduleToday" value={routine.schedule?.today ?? ""} />
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
      <button className="button-secondary" disabled={pending}>{weekly ? "Confirm next-week reset" : "Confirm reset"}</button>
    </form>
  </details>;
}
