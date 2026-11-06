"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { FormFooter } from "@/components/form-footer";
import { FormTextField } from "@/components/form-text-field";
import { SubmitButton } from "@/components/submit-button";
import { createRoutineSetupAction, validateRoutineExercisesAction } from "../setup-actions";
import { draftKey, moveItem, newSetupDraft, setupStepError, type SetupDraft } from "../setup-draft";
import { clearSetupSession, loadSetupSession, saveSetupSession } from "../setup-draft-storage";
import { routineSetupSchema, type SetupState } from "../setup-schema";
import { localDate } from "../calendar";
import { ExercisePicker } from "./exercise-picker";
import { SetupScheduling } from "./setup-scheduling";
import { DraftExerciseForm } from "./draft-exercise-form";

const subscribe = () => () => {};

export function RoutineSetup({ userId, logId, logSlug, requestId }: { userId: string; logId: string; logSlug: string; requestId: string }) {
  const router = useRouter(), key = draftKey(userId, logId);
  const [draft, setDraft] = useState(() => newSetupDraft(requestId));
  const [ready, setReady] = useState(false), [dirty, setDirty] = useState(false), [error, setError] = useState("");
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [tab, setTab] = useState(0);
  const completed = useRef(false);
  function clearDraft() { try { clearSetupSession(sessionStorage, key); } catch { /* Storage can be disabled. */ } }
  const [state, action, pending] = useActionState(async (previous: SetupState, form: FormData) => {
    const result = await createRoutineSetupAction(previous, form);
    if (result.routineId) { completed.current = true; clearDraft(); router.refresh(); }
    return result;
  }, {} as SetupState);
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        // Access to the storage object itself can be blocked by browser policy.
        let storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
        try { storage = sessionStorage; } catch { storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }; }
        const result = await loadSetupSession(storage, key, requestId, Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          (ids) => validateRoutineExercisesAction({ logId, ids }));
        if (!cancelled) {
          setDraft(result.draft); setDirty(result.restored); setReady(true);
          if (result.unavailable) setError("Some saved exercises are unavailable. Return to Exercises and remove those selections.");
        }
      } catch { if (!cancelled) setError("Could not load your setup. Your saved draft is kept; try again."); }
    }
    void restore();
    return () => { cancelled = true; };
  }, [key, logId, requestId, restoreAttempt]);
  useEffect(() => { if (ready && dirty && !completed.current) try { saveSetupSession(sessionStorage, key, draft); } catch { /* In-memory editing still works. */ } }, [key, draft, dirty, ready]);
  const today = useSyncExternalStore(subscribe, () => { try { return localDate(new Date(), draft.timezone); } catch { return ""; } }, () => "");
  function change(changes: Partial<SetupDraft>) { setDraft((current) => ({ ...current, ...changes })); setDirty(true); setError(""); }
  function next() {
    const message = setupStepError(draft);
    if (message) { setError(message); return; }
    change({ step: Math.min(3, draft.step + 1) });
  }
  const current = draft.workouts[Math.min(tab, draft.workouts.length - 1)];
  const payload = { ...draft, today, nextId: draft.style === "CONTINUOUS" ? draft.nextId : draft.workouts[0].id };
  return <><form
    action={action}
    aria-busy={pending}
    className="section-block narrow"
    onSubmit={(event) => {
      const valid = routineSetupSchema.safeParse(payload);
      if (!ready || draft.step !== 3 || !valid.success) {
        event.preventDefault();
        setError(valid.success ? "Complete setup first." : valid.error.issues[0].message);
      }
    }}
  >
    <section className="form-panel workout-panel" aria-label="Routine setup">
      <ol className="routine-steps" aria-label="Setup progress">
        {["Routine", "Exercises", "Scheduling"].map((name, index) => (
          <li key={name} aria-current={draft.step === index + 1 ? "step" : undefined}>
            {index + 1}. {name}
          </li>
        ))}
      </ol>
      {!ready ? error ? <div className="form-stack"><p role="alert" className="form-error">{error}</p><button type="button" className="button-secondary" onClick={() => { setError(""); setRestoreAttempt((current) => current + 1); }}>Retry loading setup</button></div> : <p role="status">Loading setup…</p> : <>
        <input type="hidden" name="logId" value={logId} /><input type="hidden" name="payload" value={JSON.stringify(payload)} />
        <fieldset disabled={pending} className="form-stack routine-fieldset">
          {draft.step === 1 ? <>
            <FormTextField id="routine-name" label="Routine name" value={draft.name} maxLength={80} required onChange={(event) => change({ name: event.target.value })} />
            {draft.workouts.map((workout, index) => <FormTextField
              key={workout.id}
              id={`workout-name-${index}`}
              label={`Workout ${index + 1} Name`}
              value={workout.name}
              maxLength={80}
              required
              onChange={(event) => change({ workouts: draft.workouts.map((item) => item.id === workout.id ? { ...item, name: event.target.value } : item) })}
            >
              <div className="form-actions"><button type="button" className="button-secondary" disabled={index === 0} onClick={() => change({ workouts: moveItem(draft.workouts, index, -1) })}>Move up</button><button type="button" className="button-secondary" disabled={index === draft.workouts.length - 1} onClick={() => change({ workouts: moveItem(draft.workouts, index, 1) })}>Move down</button><button type="button" className="text-button danger-text" disabled={draft.workouts.length === 1} onClick={() => { change({ workouts: draft.workouts.filter((item) => item.id !== workout.id), assignments: draft.assignments.filter((item) => item.definitionId !== workout.id), nextId: draft.nextId === workout.id ? "" : draft.nextId }); setTab(0); }}>Remove</button></div>
            </FormTextField>)}
            <button type="button" className="button-secondary" disabled={draft.workouts.length >= 30} onClick={() => change({ workouts: [...draft.workouts, { id: `new:${crypto.randomUUID()}`, name: "", exerciseIds: [] }] })}>Add workout</button>
          </> : draft.step === 2 ? <>
            <div
              className="chart-metric-options routine-workout-options"
              role="group"
              aria-label="Choose workout"
            >
              {draft.workouts.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={current.id === item.id}
                  onClick={() => setTab(index)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <ExercisePicker logId={logId} selected={current.exerciseIds} catalog={draft.catalog} newExercises={draft.newExercises} disabled={pending} onChange={(ids, catalog) => change({ catalog, workouts: draft.workouts.map((item) => item.id === current.id ? { ...item, exerciseIds: ids } : item) })} />
          </> : <SetupScheduling draft={draft} onChange={change} today={today} disabled={pending} />}
        </fieldset>
        {error || state.error ? <p role="alert" className="form-error">{error || state.error}</p> : null}
      </>}
    </section>
    {ready ? (
      <FormFooter cancel={{ disabled: pending, onClick: () => {
        completed.current = true;
        clearDraft();
        router.push(`/logs/${logSlug}`);
      } }}>
        {draft.step > 1 ? <button type="button" className="button-secondary" disabled={pending} onClick={() => change({ step: draft.step - 1 })}>Back</button> : null}
        {draft.step < 3 ? (
          <button type="button" className="button" disabled={pending} onClick={next}>Continue</button>
        ) : (
          <SubmitButton className="button" disabled={pending || !today} pendingLabel="Creating…">
            Create routine
          </SubmitButton>
        )}
      </FormFooter>
    ) : null}
  </form>
  {ready && draft.step === 2 && (
    <DraftExerciseForm
      count={draft.newExercises.length}
      disabled={pending}
      onCreate={(exercise) => change({
        newExercises: [...draft.newExercises, exercise],
        workouts: draft.workouts.map((workout) => workout.id === current.id
          ? { ...workout, exerciseIds: [...workout.exerciseIds, exercise.id] }
          : workout),
      })}
    />
  )}
  </>;
}
