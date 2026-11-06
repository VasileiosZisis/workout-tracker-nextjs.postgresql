"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { searchRoutineExercisesAction } from "../setup-actions";
import { changeEntryExerciseAction } from "../entry-exercise-actions";
import type { WorkoutActionState } from "../schema";
import type { EntryExerciseChange } from "../entry-exercises";
import type { ExerciseOption } from "../setup-schema";

export type EntryPickerIntent = Omit<EntryExerciseChange, "exerciseId" | "entryId">;

export function EntryExercisePicker({ logId, entryId, intent, plannedIds, onClose }: {
  logId: string; entryId: string; intent: EntryPickerIntent; plannedIds: string[]; onClose: () => void;
}) {
  const group = useId();
  const [selected, setSelected] = useState<ExerciseOption | null>(null);
  const [result, setResult] = useState<{ exercises: ExerciseOption[]; page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const sequence = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const [state, action, pending] = useActionState(async (previous: WorkoutActionState, form: FormData) => {
    const result = await changeEntryExerciseAction(previous, form);
    if (result.success) onClose();
    return result;
  }, {} as WorkoutActionState);
  useEffect(() => {
    heading.current?.focus();
    const request = ++sequence.current;
    void searchRoutineExercisesAction({ logId, query: "", page: 1 }).then((data) => {
      if (request === sequence.current) { setResult(data); setError(data.error ?? ""); setLoading(false); }
    }).catch(() => { if (request === sequence.current) { setError("Could not load exercises. Try again."); setLoading(false); } });
    return () => { sequence.current += 1; };
  }, [logId]);
  async function loadPage(page: number) {
    const request = ++sequence.current; setLoading(true); setError("");
    try { const data = await searchRoutineExercisesAction({ logId, query: "", page }); if (request === sequence.current) { setResult(data); setError(data.error ?? ""); } }
    catch { if (request === sequence.current) setError("Could not load exercises. Try again."); }
    finally { if (request === sequence.current) setLoading(false); }
  }
  const replacing = intent.change.operation === "replace";
  return <form action={action} className="form-stack form-panel" aria-label={replacing ? "Replace workout exercise" : "Add workout exercise"}>
    <h3 id={group} className="progress-heading" ref={heading} tabIndex={-1}>Select an exercise</h3>
    <input type="hidden" name="logId" value={logId} />
    <input type="hidden" name="payload" value={JSON.stringify({ ...intent, entryId, exerciseId: selected?.id ?? "" })} />
    <fieldset disabled={pending} className="routine-fieldset entry-exercise-options" aria-labelledby={group}>
      <div className="form-stack exercise-picker">
        {loading ? <p role="status">Loading exercises…</p> : result ? <>
          {!result.exercises.length ? <p>No exercises available. Add an exercise in the exercise library first.</p> : result.exercises.map((exercise) => <label key={exercise.id} className="chart-series-toggle chart-series-blue">
            <input type="checkbox" checked={selected?.id === exercise.id} disabled={plannedIds.includes(exercise.id)} onChange={(event) => setSelected(event.target.checked ? exercise : null)} />
            <span>{exercise.title}{plannedIds.includes(exercise.id) ? " · Already in this workout" : ""}</span>
          </label>)}
          <nav className="pagination pagination-inline" aria-label="Exercise picker pagination">
            <button type="button" className="text-link" disabled={result.page === 1} onClick={() => void loadPage(result.page - 1)}>Previous</button>
            <span className="pagination-status">Page {result.page} of {result.totalPages}</span>
            <button type="button" className="text-link" disabled={result.page === result.totalPages} onClick={() => void loadPage(result.page + 1)}>Next</button>
          </nav>
        </> : <button type="button" className="button-secondary" onClick={() => void loadPage(1)}>Retry loading exercises</button>}
        {selected && !result?.exercises.some((exercise) => exercise.id === selected.id) ? <p role="status">Selected: {selected.title}</p> : null}
      </div>
    </fieldset>
    {error || state.error ? <p className="form-error" role="alert">{error || state.error}</p> : null}
    <div className="form-actions"><button type="button" className="button-secondary" disabled={pending} onClick={onClose}>Cancel</button><button className="button" disabled={pending || !selected || plannedIds.includes(selected.id)}>{pending ? "Saving…" : replacing ? "Replace exercise" : "Add exercise"}</button></div>
  </form>;
}
