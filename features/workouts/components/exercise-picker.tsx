"use client";

import { useEffect, useRef, useState } from "react";
import { searchRoutineExercisesAction } from "../setup-actions";
import type { ExerciseOption } from "../setup-schema";

export function ExercisePicker({ logId, selected, catalog, newExercises, onChange, disabled = false }: {
  logId: string; selected: string[]; catalog: ExerciseOption[]; newExercises: { id: string; title: string }[];
  onChange: (ids: string[], options: ExerciseOption[]) => void; disabled?: boolean;
}) {
  const toggleClassName = "chart-series-toggle chart-series-blue";
  const [result, setResult] = useState<{ exercises: ExerciseOption[]; page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const sequence = useRef(0);
  useEffect(() => {
    let cancelled = false;
    void searchRoutineExercisesAction({ logId, query: "", page: 1 }).then((data) => {
      if (!cancelled) { setResult(data); setError(data.error ?? ""); setLoading(false); }
    }).catch(() => { if (!cancelled) { setError("Could not load exercises. Try again."); setLoading(false); } });
    return () => { cancelled = true; sequence.current += 1; };
  }, [logId]);
  async function search(page: number) {
    const request = ++sequence.current; setLoading(true); setError("");
    try { const data = await searchRoutineExercisesAction({ logId, query: "", page }); if (request === sequence.current) { setResult(data); setError(data.error ?? ""); } }
    catch { if (request === sequence.current) setError("Could not load exercises. Try again."); }
    finally { if (request === sequence.current) setLoading(false); }
  }
  const choices = new Map([...catalog, ...(result?.exercises ?? [])].map((item) => [item.id, item]));
  const titles = new Map([...choices.values()].map((item) => [item.id, item.title]));
  for (const item of newExercises) titles.set(item.id, item.title);
  function update(ids: string[]) { onChange(ids, [...choices.values()]); }
  const draftExerciseToggles = newExercises.map((item) => (
    <label className={toggleClassName} key={item.id}>
      <input
        type="checkbox"
        checked={selected.includes(item.id)}
        disabled={disabled}
        onChange={(event) => update(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))}
      />
      {item.title}
    </label>
  ));
  return <div className="form-stack exercise-picker">
    <h3 className="progress-heading">Select exercises</h3>
    {selected.filter((id) => !titles.has(id)).map((id) => (
      <label className={toggleClassName} key={id}>
        <input
          type="checkbox"
          checked
          disabled={disabled}
          onChange={() => update(selected.filter((item) => item !== id))}
        />
        Unavailable exercise. Uncheck to remove it.
      </label>
    ))}
    {loading ? <p role="status">Loading exercises…</p> : result ? <>
      {!result.exercises.length ? <p>No matching exercises.</p> : result.exercises.map((item) => <label className={toggleClassName} key={item.id}>
        <input type="checkbox" checked={selected.includes(item.id)} disabled={disabled} onChange={(event) => update(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />{item.title}
      </label>)}
      <nav className="pagination pagination-inline" aria-label="Exercise picker pagination">
        <button
          type="button"
          className="text-link"
          disabled={disabled || result.page === 1}
          onClick={() => void search(result.page - 1)}
        >
          Previous
        </button>
        <span className="pagination-status">Page {result.page} of {result.totalPages}</span>
        <button
          type="button"
          className="text-link"
          disabled={disabled || result.page === result.totalPages}
          onClick={() => void search(result.page + 1)}
        >
          Next
        </button>
      </nav>
    </> : (
      <button type="button" className="button-secondary" disabled={disabled} onClick={() => void search(1)}>
        Retry loading exercises
      </button>
    )}
    {draftExerciseToggles}
    {error ? <p role="alert" className="form-error">{error}</p> : null}
  </div>;
}
