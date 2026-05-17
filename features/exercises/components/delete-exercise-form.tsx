"use client";

import { useState } from "react";
import { deleteExerciseAction } from "../actions";

export function DeleteExerciseForm({
  exerciseId,
  title,
}: {
  exerciseId: string;
  title: string;
}) {
  const [confirmation, setConfirmation] = useState("");
  const canDelete = confirmation === title;

  return (
    <form className="delete-confirmation" action={deleteExerciseAction}>
      <input name="exerciseId" type="hidden" value={exerciseId} />
      <label className="field">
        <span>Type the exercise name to confirm</span>
        <input
          aria-describedby="delete-exercise-help"
          autoComplete="off"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          type="text"
        />
      </label>
      <p id="delete-exercise-help">
        This removes the exercise and every session recorded for it.
      </p>
      <button className="danger-button" type="submit" disabled={!canDelete}>
        Confirm delete
      </button>
    </form>
  );
}
