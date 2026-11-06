"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import { FormFooter } from "@/components/form-footer";
import { SubmitButton } from "@/components/submit-button";
import { saveWorkoutAssignmentsAction } from "../setup-actions";
import type { WorkoutPanelData } from "../queries";
import type { SetupState } from "../setup-schema";
import { ExercisePicker } from "./exercise-picker";
import { RoutineEditSteps } from "./routine-edit-sections";
import { DraftExerciseForm } from "./draft-exercise-form";

type Routine = NonNullable<WorkoutPanelData>;
function WorkoutAssignmentEditor({ logId, routine, definition, cancelHref, chooser }: { logId: string; routine: Routine; definition: Routine["definitions"][number]; cancelHref: string; chooser: ReactNode }) {
  const currentIds = definition.exercises.map((item) => item.exercise.id);
  const [draft, setDraft] = useState<{ baseIds: string[]; selected: string[]; catalog: { id: string; title: string; slug: string }[]; newExercises: { id: string; title: string }[] } | null>(null);
  const selected = draft?.selected ?? currentIds;
  const catalog = draft?.catalog ?? definition.exercises.map((item) => item.exercise);
  const newExercises = draft?.newExercises ?? [];
  const conflict = !!draft && JSON.stringify(draft.baseIds) !== JSON.stringify(currentIds);
  const [state, action, pending] = useActionState(async (previous: SetupState, form: FormData) => {
    const result = await saveWorkoutAssignmentsAction(previous, form);
    if (result.routineId) setDraft(null);
    return result;
  }, {} as SetupState);
  const payload = { routineId: routine.id, definitionId: definition.id, revision: routine.revision,
    expectedScheduleId: routine.schedule?.id ?? "", expectedToday: routine.schedule?.today ?? "",
    exerciseIds: selected, newExercises };
  return <><form action={action} onSubmit={(event) => { if (conflict) event.preventDefault(); }}>
    <div className="form-stack form-panel workout-panel">
      <RoutineEditSteps />
      {chooser}
      <input type="hidden" name="logId" value={logId} /><input type="hidden" name="routineId" value={routine.id} /><input type="hidden" name="payload" value={JSON.stringify(payload)} />
      <ExercisePicker
        key={currentIds.join(",")}
        logId={logId}
        selected={selected}
        catalog={catalog}
        newExercises={newExercises}
        disabled={pending || conflict}
        onChange={(ids, options) => setDraft({ baseIds: draft?.baseIds ?? currentIds, selected: ids, catalog: options, newExercises })}
      />
      {conflict ? <div className="form-stack"><p className="form-error" role="alert">This workout’s exercises changed elsewhere. Your draft has been kept. Reload this workout’s exercises to discard the draft and use the saved list.</p><button type="button" className="button-secondary" onClick={() => setDraft(null)}>Reload workout exercises</button></div> : null}
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : state.routineId ? <p role="status">Exercises saved.</p> : null}
    </div>
    <FormFooter cancel={{ href: cancelHref }}>
      <SubmitButton className="button" pendingLabel="Saving…" disabled={conflict || !selected.length}>Save exercises</SubmitButton>
    </FormFooter>
  </form>
  <DraftExerciseForm
    count={newExercises.length}
    disabled={pending || conflict}
    onCreate={(exercise) => setDraft({
      baseIds: draft?.baseIds ?? currentIds,
      selected: [...selected, exercise.id],
      catalog,
      newExercises: [...newExercises, exercise],
    })}
  />
  </>;
}
export function AssignmentEditor({ logId, routine, cancelHref }: { logId: string; routine: Routine; cancelHref: string }) {
  const id = useId();
  const [tab, setTab] = useState(0);
  const [visited, setVisited] = useState([routine.definitions[0]?.id ?? ""]);
  const definition = routine.definitions[Math.min(tab, routine.definitions.length - 1)];
  if (!definition) return <div className="form-panel"><RoutineEditSteps /></div>;
  const chooser = (
    <div className="chart-metric-options routine-workout-options" role="group" aria-label="Choose workout">
      {routine.definitions.map((item, index) => (
        <button type="button" key={item.id} aria-pressed={definition.id === item.id} onClick={() => {
          setTab(index);
          setVisited((current) => current.includes(item.id) ? current : [...current, item.id]);
          requestAnimationFrame(() => {
            document.getElementById(`${id}-${item.id}`)
              ?.querySelector<HTMLButtonElement>(".routine-workout-options [aria-pressed='true']")
              ?.focus({ preventScroll: true });
          });
        }}>{item.name}</button>
      ))}
    </div>
  );
  return <div className="form-stack">
    {routine.definitions.filter((item) => item.id === definition.id || visited.includes(item.id)).map((item) => <div key={item.id} id={`${id}-${item.id}`} hidden={item.id !== definition.id}><WorkoutAssignmentEditor logId={logId} routine={routine} definition={item} cancelHref={cancelHref} chooser={chooser} /></div>)}
  </div>;
}
