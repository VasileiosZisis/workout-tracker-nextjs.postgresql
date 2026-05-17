"use client";

import { deleteExerciseAction } from "../actions";

export function DeleteExerciseForm({ exerciseId }: { exerciseId: string }) {
  return (
    <form
      action={deleteExerciseAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this exercise?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="exerciseId" type="hidden" value={exerciseId} />
      <button className="danger-button" type="submit">
        Delete
      </button>
    </form>
  );
}
