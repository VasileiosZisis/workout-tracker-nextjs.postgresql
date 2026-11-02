"use client";

import { useActionState } from "react";
import { workoutAction } from "../actions";
import type { WorkoutPanelData } from "../queries";
import type { WorkoutActionState } from "../schema";

const initial: WorkoutActionState = {};
type Routine = NonNullable<WorkoutPanelData>;
type Definition = Routine["definitions"][number];

export function WorkoutExerciseSettings({ logId, routine, definition }: {
  logId: string; routine: Routine; definition: Definition;
}) {
  const [state, action, pending] = useActionState(workoutAction, initial);
  const ids = definition.exercises.map((suggestion) => suggestion.id);
  function order(index: number, offset: number) {
    const next = [...ids];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    return JSON.stringify(next);
  }
  function fields() {
    return <>
      <input type="hidden" name="logId" value={logId} />
      <input type="hidden" name="routineId" value={routine.id} />
      <input type="hidden" name="revision" value={routine.revision} />
      <input type="hidden" name="definitionId" value={definition.id} />
    </>;
  }
  return <section className="section-block narrow workout-panel" aria-label={`${definition.name} remembered exercises`}>
    <h2>{definition.name} exercises</h2>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    {state.success ? <p role="status">{state.success}</p> : null}
    {definition.exercises.length ? <ol className="workout-exercise-list">
      {definition.exercises.map(({ id, exercise }, index) => <li key={id}>
        <strong>{exercise.title}</strong>
        <div className="form-actions">
          <form action={action}>
            {fields()}<input type="hidden" name="operation" value="reorderExercises" />
            <button className="button-secondary" type="submit" name="order" value={index > 0 ? order(index, -1) : "[]"} disabled={pending || index === 0} aria-label={`Move ${exercise.title} earlier`}>Move up</button>
          </form>
          <form action={action}>
            {fields()}<input type="hidden" name="operation" value="reorderExercises" />
            <button className="button-secondary" type="submit" name="order" value={index < ids.length - 1 ? order(index, 1) : "[]"} disabled={pending || index === ids.length - 1} aria-label={`Move ${exercise.title} later`}>Move down</button>
          </form>
          <form action={action}>
            {fields()}<input type="hidden" name="operation" value="removeExercise" />
            <button className="text-button danger-text" type="submit" name="suggestionId" value={id} disabled={pending} aria-label={`Remove ${exercise.title} suggestion`}>Remove</button>
          </form>
        </div>
      </li>)}
    </ol> : <p>Exercises will appear here after you log new sessions in this workout.</p>}
    <p>Removing a suggestion keeps past sessions. Logging a new session for that exercise remembers it again.</p>
  </section>;
}
