"use client";

import { useActionState, useId, useState } from "react";
import { FormFooter } from "@/components/form-footer";
import { FormTextField } from "@/components/form-text-field";
import { SubmitButton } from "@/components/submit-button";
import { RoutineEditSteps } from "./routine-edit-sections";
import { workoutAction } from "../actions";
import type { WorkoutPanelData } from "../queries";
import type { WorkoutActionState } from "../schema";

const initial: WorkoutActionState = {};

export function RoutineSettings({ logId, routine, cancelHref }: { logId: string; routine: WorkoutPanelData; cancelHref: string }) {
  const [state, action] = useActionState(workoutAction, initial);
  const [workouts, setWorkouts] = useState(routine?.definitions.map(({ id, name }) => ({ id, name })) ?? [{ id: "new:1", name: "" }]);
  const [nextId, setNextId] = useState(routine?.nextId ?? "new:1");
  const nameId = useId();
  function move(index: number, offset: number) {
    setWorkouts((current) => { const next = [...current]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; });
  }
  return <form action={action}>
    <div className="form-stack form-panel workout-panel">
      <RoutineEditSteps />
      <input type="hidden" name="operation" value="save" /><input type="hidden" name="logId" value={logId} />
      <input type="hidden" name="revision" value={routine?.revision ?? 0} /><input type="hidden" name="workouts" value={JSON.stringify(workouts)} />
      {routine?.schedule ? <><input type="hidden" name="expectedScheduleId" value={routine.schedule.id} /><input type="hidden" name="expectedToday" value={routine.schedule.today} /></> : null}
      <FormTextField id={nameId} label="Routine name" name="name" defaultValue={routine?.name ?? "My split"} maxLength={80} required />
      {workouts.map((workout, index) => <FormTextField
        key={workout.id}
        id={`${nameId}-${index}`}
        label={`Workout ${index + 1} Name`}
        value={workout.name}
        maxLength={80}
        required
        onChange={(event) => setWorkouts((current) => current.map((item) => item.id === workout.id ? { ...item, name: event.target.value } : item))}
      >
        <div className="form-actions">
          <button className="button-secondary" type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move workout ${index + 1} earlier`}>Move up</button>
          <button className="button-secondary" type="button" disabled={index === workouts.length - 1} onClick={() => move(index, 1)} aria-label={`Move workout ${index + 1} later`}>Move down</button>
          <button className="text-button danger-text" type="button" disabled={workouts.length === 1} onClick={() => { setWorkouts((current) => current.filter((item) => item.id !== workout.id)); if (nextId === workout.id) setNextId(""); }}>Remove</button>
        </div>
      </FormTextField>)}
      <button className="button-secondary" type="button" disabled={workouts.length >= 30} onClick={() => setWorkouts((current) => [...current, { id: `new:${crypto.randomUUID()}`, name: "" }])}>Add workout</button>
      {routine?.schedule && routine.schedule.style !== "CONTINUOUS" ? <><input type="hidden" name="nextId" value={workouts.some((item) => item.id === routine.nextId) ? routine.nextId : workouts[0]?.id ?? ""} /><p>Changes to workout names or order apply today and start a new schedule list. Past outcomes are preserved.</p><label className="checkbox-row"><input type="checkbox" name="applyTodayConfirmed" value="yes" required />Confirm applying workout changes today.</label></> : <label className="field">Next workout<select name="nextId" value={nextId} required onChange={(event) => setNextId(event.target.value)}>
        <option value="">Choose next workout</option>{workouts.map((workout) => <option key={workout.id} value={workout.id}>{workout.name || "Unnamed workout"}</option>)}
      </select></label>}
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state.success ? <p role="status">{state.success}</p> : null}
    </div>
    <FormFooter cancel={{ href: cancelHref }}>
      <SubmitButton className="button" pendingLabel="Saving…">{routine ? "Save workouts" : "Create routine"}</SubmitButton>
    </FormFooter>
  </form>;
}
