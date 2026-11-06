"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { DeleteConfirmationForm } from "@/components/delete-confirmation-form";
import { FormFooter } from "@/components/form-footer";
import type { getActiveWorkoutDetail } from "../queries";
import { endWorkoutFromViewAction } from "../view-actions";
import type { WorkoutActionState } from "../schema";
import { EntryExercisePicker, type EntryPickerIntent } from "./entry-exercise-picker";

export function ActiveWorkout({ logId, logSlug, entry }: {
  logId: string; logSlug: string;
  entry: NonNullable<Awaited<ReturnType<typeof getActiveWorkoutDetail>>>;
}) {
  const [state, action, pending] = useActionState(endWorkoutFromViewAction, {} as WorkoutActionState);
  const [picker, setPicker] = useState<EntryPickerIntent | null>(null);
  const assignments = entry.exercises;
  const assignedIds = new Set(assignments.map((item) => item.exercise.id));
  const otherSessions = entry.sessions.filter((session) => !assignedIds.has(session.exercise.id));
  const exercisePicker = picker && <EntryExercisePicker key={picker.requestId} logId={logId} entryId={entry.id} intent={picker} plannedIds={[...assignedIds]} onClose={() => setPicker(null)} />;
  return <section className="section-block workout-panel" aria-label="Active workout exercises">
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <div className="workout-summary-row">
      <button type="button" className="button-secondary" disabled={pending || !!picker} onClick={() => setPicker({ requestId: crypto.randomUUID(), expectedRevision: entry.exercisePlanRevision, change: { operation: "add" } })}>Add exercise</button>
    </div>
    {picker && (picker.change.operation === "add" || !assignedIds.has(picker.change.originalExerciseId)) && exercisePicker}
    {assignments.length ? <ul className="list evidence-list workout-exercise-list">{assignments.map(({ id, exercise }) => {
      const recorded = entry.sessions.filter((session) => session.exercise.id === exercise.id);
      return <li key={id}>
        <div className="list-item session-card routine-workout-row workout-summary-row">
          <div className="workout-exercise-info">
            <h3>{exercise.title}</h3>
            <p>{recorded.length ? "Recorded" : "Not recorded yet"}</p>
          </div>
          <div className="form-actions">
            {recorded.length ? recorded.map((session, index) => (
              <Link key={session.id} className="button-secondary" href={`/logs/${logSlug}/exercises/${exercise.slug}/weightlifting/${session.id}/edit`}>
                {recorded.length === 1 ? "Edit session" : `Edit session ${index + 1}`}
              </Link>
            )) : <Link className="button-secondary" href={`/logs/${logSlug}/exercises/${exercise.slug}/weightlifting/new?workoutEntryId=${encodeURIComponent(entry.id)}`}>Add session</Link>}
            <button type="button" className="button-secondary" disabled={pending || !!picker} aria-label={`Replace ${exercise.title}`} onClick={() => setPicker({ requestId: crypto.randomUUID(), expectedRevision: entry.exercisePlanRevision, change: { operation: "replace", originalExerciseId: exercise.id } })}>Replace</button>
          </div>
        </div>
        {picker?.change.operation === "replace" && picker.change.originalExerciseId === exercise.id && exercisePicker}
      </li>;
    })}</ul> : <div className="empty-state"><h3>No exercises planned</h3><p>Add an exercise to begin. Manage permanent exercise lists under Routine.</p></div>}
    {otherSessions.length > 0 && <section className="section-block">
      <div className="section-heading"><h2>Other recorded sessions</h2></div>
      <div className="list evidence-list">{otherSessions.map((session) => (
        <Link key={session.id} className="list-item session-card" href={`/logs/${logSlug}/exercises/${session.exercise.slug}/weightlifting/${session.id}`}>
          <div className="workout-exercise-info"><h3>{session.exercise.title}</h3><p>View session</p></div>
        </Link>
      ))}</div>
    </section>}
    <form action={action} className="section-block"><input type="hidden" name="logId" value={logId} /><input type="hidden" name="entryId" value={entry.id} /><input type="hidden" name="operation" value="finish" />
      <FormFooter cancel={{ href: `/logs/${logSlug}` }}>
        <button className="button" disabled={pending || !!picker || !entry.sessions.length}>Finish workout</button>
      </FormFooter>
    </form>
    <section className="section-block narrow danger-zone">
      <h2>Delete workout</h2>
      <p>Deleting this workout cannot be undone.</p>
      <DeleteConfirmationForm
        action={action}
        disabled={pending || !!picker}
        label="I understand that this workout will be deleted."
        description="Recorded sessions are kept as standalone sessions."
      >
        <input type="hidden" name="logId" value={logId} />
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="operation" value="discard" />
      </DeleteConfirmationForm>
    </section>
  </section>;
}
