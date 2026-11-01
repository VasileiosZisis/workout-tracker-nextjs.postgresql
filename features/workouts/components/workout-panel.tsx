"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { workoutAction } from "../actions";
import type { WorkoutPanelData } from "../queries";
import type { WorkoutActionState } from "../schema";
import { PerformedDateInput } from "@/components/performed-date-input";

const initial: WorkoutActionState = {};

export function WorkoutPanel({ logId, logSlug, routine, requestId }: { logId: string; logSlug: string; routine: WorkoutPanelData; requestId: string }) {
  const [state, action, pending] = useActionState(workoutAction, initial);
  const active = routine?.active;
  return <section className="section-block form-panel workout-panel" aria-label="Workout routine">
    <h2>{routine?.name ?? "Workout routine"}</h2>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    {state.success ? <p role="status">{state.success}</p> : null}
    {!routine ? <RoutineSettings logId={logId} routine={null} /> : active ? <>
      <h3>{active.name} · In progress</h3>
      <p>{active.date}</p>
      <ul>{active.sessions.map((session) => <li key={session.id}>
        <Link href={`/logs/${logSlug}/exercises/${session.exercise.slug}/weightlifting/${session.id}`}>{session.exercise.title}</Link>
      </li>)}</ul>
      {!active.sessions.length ? <p>No exercise sessions recorded yet.</p> : null}
      <div className="form-actions">
        <a className="button-secondary" href="#exercise-list">Continue logging</a>
        <form action={action}>
          <input type="hidden" name="logId" value={logId} /><input type="hidden" name="entryId" value={active.id} />
          <button className="button" name="operation" value="finish" disabled={pending || !active.sessions.length}>Finish workout</button>
        </form>
      </div>
      <details><summary>Discard workout</summary>
        <form action={action} className="form-stack">
          <input type="hidden" name="logId" value={logId} /><input type="hidden" name="entryId" value={active.id} />
          <label className="checkbox-row"><input type="checkbox" name="confirmed" value="yes" required />Keep all recorded sessions as standalone and discard this workout.</label>
          <button className="button-secondary" name="operation" value="discard" disabled={pending}>Confirm discard</button>
        </form>
      </details>
      <p>Finish or discard this workout before starting another date. Standalone logging is always available.</p>
    </> : <>
      <p>Up next: <strong>{routine.definitions.find((definition) => definition.id === routine.nextId)?.name}</strong></p>
      <form action={action} className="form-stack">
        <input type="hidden" name="logId" value={logId} /><input type="hidden" name="routineId" value={routine.id} />
        <input type="hidden" name="revision" value={routine.revision} /><input type="hidden" name="nextId" value={routine.nextId} />
        <input type="hidden" name="requestId" value={requestId} />
        <div className="field"><label htmlFor="performedDate">Performed date</label><PerformedDateInput /></div>
        <div className="form-actions"><button className="button" name="operation" value="start" disabled={pending}>Start workout</button></div>
      </form>
      <p>Continuous rotation · {routine.definitions.map((definition) => definition.name).join(" → ")}</p>
      <details><summary>Routine settings</summary><RoutineSettings logId={logId} routine={routine} /></details>
    </>}
  </section>;
}

function RoutineSettings({ logId, routine }: { logId: string; routine: WorkoutPanelData }) {
  const [state, action, pending] = useActionState(workoutAction, initial);
  const [workouts, setWorkouts] = useState(routine?.definitions ?? ["A", "B", "C"].map((name) => ({ id: `new:${name}`, name })));
  const [nextId, setNextId] = useState(routine?.nextId ?? "new:A");
  const nameId = useId();
  function move(index: number, offset: number) {
    setWorkouts((current) => { const next = [...current]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; });
  }
  return <form action={action} className="form-stack">
    <input type="hidden" name="operation" value="save" /><input type="hidden" name="logId" value={logId} />
    <input type="hidden" name="revision" value={routine?.revision ?? 0} /><input type="hidden" name="workouts" value={JSON.stringify(workouts)} />
    <div className="field"><label htmlFor={nameId}>Routine name</label><input type="text" id={nameId} name="name" defaultValue={routine?.name ?? "My split"} maxLength={80} required /></div>
    {workouts.map((workout, index) => <fieldset className="field" key={workout.id}>
      <legend>Workout {index + 1}</legend>
      <label>Name<input type="text" value={workout.name} maxLength={80} required onChange={(event) => setWorkouts((current) => current.map((item) => item.id === workout.id ? { ...item, name: event.target.value } : item))} /></label>
      <div className="form-actions">
        <button className="button-secondary" type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move workout ${index + 1} earlier`}>Move up</button>
        <button className="button-secondary" type="button" disabled={index === workouts.length - 1} onClick={() => move(index, 1)} aria-label={`Move workout ${index + 1} later`}>Move down</button>
        <button className="text-button" type="button" disabled={workouts.length === 1} onClick={() => { setWorkouts((current) => current.filter((item) => item.id !== workout.id)); if (nextId === workout.id) setNextId(""); }}>Remove</button>
      </div>
    </fieldset>)}
    <button className="button-secondary" type="button" disabled={workouts.length >= 30} onClick={() => setWorkouts((current) => [...current, { id: `new:${crypto.randomUUID()}`, name: "" }])}>Add workout</button>
    <label className="field">Next workout<select name="nextId" value={nextId} required onChange={(event) => setNextId(event.target.value)} disabled={Boolean(routine?.nextId && workouts.some((workout) => workout.id === routine.nextId))}>
      <option value="">Choose next workout</option>{workouts.map((workout) => <option key={workout.id} value={workout.id}>{workout.name || "Unnamed workout"}</option>)}
    </select></label>
    {routine?.nextId && workouts.some((workout) => workout.id === routine.nextId) ? <input type="hidden" name="nextId" value={routine.nextId} /> : null}
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    {state.success ? <p role="status">{state.success}</p> : null}
    <div className="form-actions"><button className="button" disabled={pending}>{routine ? "Save routine" : "Create routine"}</button></div>
  </form>;
}
