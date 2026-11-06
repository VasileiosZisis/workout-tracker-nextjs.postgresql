"use client";

import { useActionState } from "react";
import { DeleteConfirmationForm } from "@/components/delete-confirmation-form";
import { workoutAction } from "../actions";
import type { WorkoutActionState } from "../schema";

const initial: WorkoutActionState = {};

export function DeleteRoutineForm({ logId, routineId, revision, active }: {
  logId: string; routineId: string; revision: number; active: boolean;
}) {
  const [state, action] = useActionState(workoutAction, initial);
  return <section className="section-block narrow danger-zone">
    <h2>Delete routine</h2>
    <p>Deleting a routine cannot be undone.</p>
    {active ? <p>Finish or discard the active workout before deleting this routine.</p> : (
      <DeleteConfirmationForm
        action={action}
        label="I understand that this routine will be deleted."
        description="This removes the routine and its workout history. Your exercise sessions, sets, and progress are kept."
        error={state.error}
      >
        <input type="hidden" name="operation" value="delete" />
        <input type="hidden" name="logId" value={logId} />
        <input type="hidden" name="routineId" value={routineId} />
        <input type="hidden" name="revision" value={revision} />
      </DeleteConfirmationForm>
    )}
  </section>;
}
