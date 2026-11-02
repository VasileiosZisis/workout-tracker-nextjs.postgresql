"use client";

import { useActionState } from "react";
import { workoutAction } from "../actions";
import type { WorkoutActionState } from "../schema";

const initial: WorkoutActionState = {};

export function DeleteRoutineForm({ logId, routineId, revision, active }: {
  logId: string; routineId: string; revision: number; active: boolean;
}) {
  const [state, action, pending] = useActionState(workoutAction, initial);
  return <section className="section-block narrow danger-zone">
    <h2>Delete routine</h2>
    <p>This removes the routine and its workout history. Your exercise sessions, sets, and progress are kept.</p>
    {active ? <p>Finish or discard the active workout before deleting this routine.</p> : <details>
      <summary>Delete routine</summary>
      <form action={action} className="form-stack">
        <input type="hidden" name="operation" value="delete" />
        <input type="hidden" name="logId" value={logId} />
        <input type="hidden" name="routineId" value={routineId} />
        <input type="hidden" name="revision" value={revision} />
        <label className="checkbox-row"><input type="checkbox" name="confirmed" value="yes" required />I understand that the routine and its workout history will be deleted.</label>
        {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
        <div className="form-actions"><button className="text-button danger-text" disabled={pending}>{pending ? "Deleting…" : "Confirm delete routine"}</button></div>
      </form>
    </details>}
  </section>;
}
