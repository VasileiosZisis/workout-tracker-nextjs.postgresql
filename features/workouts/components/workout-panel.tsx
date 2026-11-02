"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { workoutAction } from "../actions";
import type { WorkoutPanelData } from "../queries";
import type { WorkoutActionState } from "../schema";
import { WorkoutStartControls } from "./workout-start-controls";

const initial: WorkoutActionState = {};

export function WorkoutPanel({ logId, logSlug, routine, requestId }: { logId: string; logSlug: string; routine: WorkoutPanelData; requestId: string }) {
  const [state, action, pending] = useActionState(workoutAction, initial);
  const active = routine?.active;
  if (!routine) return null;
  const remembered = routine.definitions.find((definition) => definition.id === active?.definitionId)?.exercises ?? [];
  const rememberedIds = new Set(remembered.map((suggestion) => suggestion.exercise.id));
  return <section className="section-block form-panel workout-panel" aria-label="Workout routine">
    <h2>{routine?.name ?? "Workout routine"}</h2>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    {state.success ? <p role="status">{state.success}</p> : null}
    {active ? <>
      {routine.schedule ? <p>{routine.schedule.style === "WEEKLY" ? "Weekly sequence" : routine.schedule.style === "FIXED" ? "Fixed weekdays" : "Continuous rotation"} · Today: {routine.schedule.today} ({routine.schedule.timezone})</p> : null}
      <h3>{active.name} · In progress</h3>
      <p>{active.date}</p>
      {active.scheduledDate ? <p>Planned: {active.plannedName} · {active.scheduledDate}</p> : active.plannedName && active.plannedName !== active.name ? <p>Planned: {active.plannedName} · Substitution</p> : null}
      {remembered.length ? <ul className="workout-exercise-list">
        {remembered.map(({ id, exercise }) => {
          const recorded = active.sessions.filter((session) => session.exercise.id === exercise.id);
          return <li key={id}>
            <strong>{exercise.title}</strong>
            {recorded.length ? <>
              <p>Recorded · {recorded.length} {recorded.length === 1 ? "session" : "sessions"}</p>
              <ul>{recorded.map((session, index) => <li key={session.id}><Link href={`/logs/${logSlug}/exercises/${exercise.slug}/weightlifting/${session.id}`}>View session {index + 1}</Link></li>)}</ul>
            </> : <p>Not recorded yet</p>}
            <Link className="button-secondary" href={`/logs/${logSlug}/exercises/${exercise.slug}/weightlifting/new?workoutEntryId=${encodeURIComponent(active.id)}`}>
              {recorded.length ? "Log another session" : "Log session"}
            </Link>
          </li>;
        })}
      </ul> : <p>Log an exercise to remember it for the next time you do this workout.</p>}
      {active.sessions.some((session) => !rememberedIds.has(session.exercise.id)) ? <ul>{active.sessions.filter((session) => !rememberedIds.has(session.exercise.id)).map((session) => <li key={session.id}>
        <Link href={`/logs/${logSlug}/exercises/${session.exercise.slug}/weightlifting/${session.id}`}>{session.exercise.title}</Link>
      </li>)}</ul> : null}
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
      <WorkoutStartControls key={`${routine.revision}:${routine.schedule?.id}:${routine.schedule?.today}`} logId={logId} logSlug={logSlug} routineId={routine.id} revision={routine.revision} nextId={routine.nextId} definitions={routine.definitions} schedule={routine.schedule} requestId={requestId} />
    </>}
    <Link href={`/routine/${logSlug}`}>Manage routine</Link>
  </section>;
}

export function RoutineSettings({ logId, routine }: { logId: string; routine: WorkoutPanelData }) {
  const [state, action, pending] = useActionState(workoutAction, initial);
  const [workouts, setWorkouts] = useState(routine?.definitions.map(({ id, name }) => ({ id, name })) ?? [{ id: "new:1", name: "" }]);
  const [nextId, setNextId] = useState(routine?.nextId ?? "new:1");
  const nameId = useId();
  function move(index: number, offset: number) {
    setWorkouts((current) => { const next = [...current]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; });
  }
  return <form action={action} className="form-stack">
    <input type="hidden" name="operation" value="save" /><input type="hidden" name="logId" value={logId} />
    <input type="hidden" name="revision" value={routine?.revision ?? 0} /><input type="hidden" name="workouts" value={JSON.stringify(workouts)} />
    {routine?.schedule ? <><input type="hidden" name="expectedScheduleId" value={routine.schedule.id} /><input type="hidden" name="expectedToday" value={routine.schedule.today} /></> : null}
    <div className="field"><label htmlFor={nameId}>Routine name</label><input type="text" id={nameId} name="name" defaultValue={routine?.name ?? "My split"} maxLength={80} required /></div>
    {workouts.map((workout, index) => <div className="field" key={workout.id}>
      <label className="workout-name-field">
        <span>Workout {index + 1} Name</span>
        <input type="text" value={workout.name} maxLength={80} required onChange={(event) => setWorkouts((current) => current.map((item) => item.id === workout.id ? { ...item, name: event.target.value } : item))} />
      </label>
      <div className="form-actions">
        <button className="button-secondary" type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move workout ${index + 1} earlier`}>Move up</button>
        <button className="button-secondary" type="button" disabled={index === workouts.length - 1} onClick={() => move(index, 1)} aria-label={`Move workout ${index + 1} later`}>Move down</button>
        <button className="text-button danger-text" type="button" disabled={workouts.length === 1} onClick={() => { setWorkouts((current) => current.filter((item) => item.id !== workout.id)); if (nextId === workout.id) setNextId(""); }}>Remove</button>
      </div>
    </div>)}
    <button className="button-secondary" type="button" disabled={workouts.length >= 30} onClick={() => setWorkouts((current) => [...current, { id: `new:${crypto.randomUUID()}`, name: "" }])}>Add workout</button>
    {routine?.schedule && routine.schedule.style !== "CONTINUOUS" ? <><input type="hidden" name="nextId" value={workouts.some((item) => item.id === routine.nextId) ? routine.nextId : workouts[0]?.id ?? ""} /><p>Changes to workout names or order apply today and start a new schedule list. Past outcomes are preserved.</p><label className="checkbox-row"><input type="checkbox" name="applyTodayConfirmed" value="yes" required />Confirm applying workout changes today.</label></> : <label className="field">Next workout<select name="nextId" value={nextId} required onChange={(event) => setNextId(event.target.value)}>
      <option value="">Choose next workout</option>{workouts.map((workout) => <option key={workout.id} value={workout.id}>{workout.name || "Unnamed workout"}</option>)}
    </select></label>}
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    {state.success ? <p role="status">{state.success}</p> : null}
    <div className="form-actions"><button className="button" disabled={pending}>{routine ? "Save routine" : "Create routine"}</button></div>
  </form>;
}
