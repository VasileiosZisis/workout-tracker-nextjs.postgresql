"use client";

import { SubmitButton } from "@/components/submit-button";
import { PerformedDateInput } from "@/components/performed-date-input";
import { useActionState, useCallback, useState, type ReactNode } from "react";
import type { WeightliftingActionState, WeightliftingFormSet } from "../types";
import type { WorkoutSelection } from "@/features/workouts/schema";

type WeightliftingSessionFormProps = {
  action: (
    previousState: WeightliftingActionState,
    formData: FormData,
  ) => Promise<WeightliftingActionState>;
  defaultPerformedDate?: string;
  defaultSets?: WeightliftingFormSet[];
  exerciseId?: string;
  formId?: string;
  footer?: ReactNode;
  moveAddSetToActions?: boolean;
  sessionId?: string;
  showSubmitButton?: boolean;
  submitLabel: string;
  requestId?: string;
  workout?: WorkoutSelection | null;
  linkedWorkout?: { id: string; name: string; date: string } | null;
  returnWorkoutEntryId?: string;
};

const initialState: WeightliftingActionState = {};
const emptySet: WeightliftingFormSet = {
  repetitions: "10",
  kilograms: "0",
  isHard: false,
};

export function WeightliftingSessionForm({
  action,
  defaultPerformedDate,
  defaultSets = [emptySet],
  exerciseId,
  formId,
  footer,
  moveAddSetToActions = false,
  sessionId,
  showSubmitButton = true,
  submitLabel,
  requestId,
  workout,
  linkedWorkout,
  returnWorkoutEntryId,
}: WeightliftingSessionFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [sets, setSets] = useState<WeightliftingFormSet[]>(
    defaultSets.length > 0 ? defaultSets : [emptySet],
  );
  const [date, setDate] = useState(defaultPerformedDate);
  const activeWorkout = workout?.active;
  const schedule = workout?.schedule;
  const [chosenDefinition, setChosenDefinition] = useState("");
  const [selection, setSelection] = useState(
    linkedWorkout?.id ?? (!sessionId && activeWorkout && activeWorkout.date === defaultPerformedDate ? activeWorkout.id : "standalone"),
  );
  const handleDateChange = useCallback((nextDate: string) => {
    const initializing = date === undefined;
    setDate(nextDate);
    setChosenDefinition("");
    if (!sessionId) {
      setSelection((current) => {
        if (initializing && activeWorkout?.date === nextDate) return activeWorkout.id;
        if (!initializing && nextDate !== date && (current === "start" || current.startsWith("extra:") || current.startsWith("makeup:"))) return "";
        if (current !== "standalone" && current !== "start" && activeWorkout?.date !== nextDate) return "";
        return current;
      });
    }
  }, [date, sessionId, activeWorkout]);
  const makeupSlot = selection.startsWith("makeup:") ? schedule?.choices.find((slot) => `makeup:${slot.key}` === selection) : undefined;
  const starting = selection === "start" || selection.startsWith("extra:") || selection.startsWith("makeup:");
  const startIntent = makeupSlot ? "MAKEUP" : selection.startsWith("extra:") ? "EXTRA" : schedule?.style && schedule.style !== "CONTINUOUS" ? "SCHEDULED" : "ROTATION";
  const plannedDefinition = makeupSlot?.definitionId ?? (startIntent === "SCHEDULED" ? schedule?.next?.definitionId : workout?.nextId) ?? "";

  function updateSet(index: number, nextSet: WeightliftingFormSet) {
    setSets((currentSets) =>
      currentSets.map((set, currentIndex) =>
        currentIndex === index ? nextSet : set,
      ),
    );
  }

  function addSet() {
    setSets((currentSets) => [...currentSets, emptySet]);
  }

  function removeSet(index: number) {
    setSets((currentSets) =>
      currentSets.length === 1
        ? currentSets
        : currentSets.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  return (
    <form aria-busy={pending} action={formAction} id={formId} onSubmit={(event) => { if (pending) event.preventDefault(); }}>
      <div className="form-stack form-panel">
        {requestId ? <input type="hidden" name="requestId" value={requestId} /> : null}
        {returnWorkoutEntryId ? <input type="hidden" name="returnWorkoutEntryId" value={returnWorkoutEntryId} /> : null}
        {starting ? <>
          <input type="hidden" name="schedulingIntent" value={startIntent} />
          <input type="hidden" name="scheduleId" value={makeupSlot?.scheduleId ?? schedule?.id ?? ""} />
          <input type="hidden" name="slotKey" value={makeupSlot?.key ?? (startIntent === "SCHEDULED" ? schedule?.next?.key : "") ?? ""} />
          <input type="hidden" name="scheduleToday" value={schedule?.today ?? ""} />
          <input type="hidden" name="chosenDefinitionId" value={selection.startsWith("extra:") ? selection.slice(6) : chosenDefinition || plannedDefinition} />
        </> : null}
        {workout ? <>
          <input type="hidden" name="routineId" value={workout.routineId} />
          <input type="hidden" name="routineRevision" value={workout.revision} />
          <input type="hidden" name="nextDefinitionId" value={workout.nextId} />
        </> : null}
        {exerciseId ? <input name="exerciseId" type="hidden" value={exerciseId} /> : null}
        {sessionId ? <input name="sessionId" type="hidden" value={sessionId} /> : null}
        <input name="setCount" type="hidden" value={sets.length} />
        <div className="field">
          <label htmlFor="performedDate">Date</label>
          <PerformedDateInput defaultValue={defaultPerformedDate} onDateChange={handleDateChange} />
          {state.fieldErrors?.performedDate ? (
            <p className="form-error">{state.fieldErrors.performedDate[0]}</p>
          ) : null}
        </div>
        {workout || linkedWorkout ? <div className="field">
          <label htmlFor="workoutSelection">Workout</label>
          <input type="hidden" name="workoutSelection" value={starting ? "start" : selection} />
          <select id="workoutSelection" value={selection} required disabled={pending} onChange={(event) => { setSelection(event.target.value); setChosenDefinition(""); }}>
            <option value="" disabled>Choose a workout or Standalone</option>
            <option value="standalone">Standalone</option>
            {sessionId && linkedWorkout ? <option value={linkedWorkout.id}>{linkedWorkout.name} · {linkedWorkout.date}</option> : null}
            {!sessionId && activeWorkout && activeWorkout.date === date ? <option value={activeWorkout.id}>{activeWorkout.name} · {activeWorkout.date}</option> : null}
            {!sessionId && workout && !activeWorkout ? <>
              {(!schedule || schedule.style === "CONTINUOUS" || (schedule.next && date === schedule.today)) ? <option value="start">Start next workout · {schedule?.style && schedule.style !== "CONTINUOUS" ? schedule.next?.name : workout.nextName}</option> : null}
              {workout.definitions?.map((definition) => <option key={definition.id} value={`extra:${definition.id}`}>Extra workout · {definition.name}</option>)}
              {schedule?.choices.filter((slot) => (slot.outcome === "MISSED" || slot.outcome === "SKIPPED") && date && date >= slot.date && date <= schedule.today).map((slot) => <option key={slot.key} value={`makeup:${slot.key}`}>Make up · {slot.name} · {slot.date}</option>)}
            </> : null}
          </select>
          {starting && !selection.startsWith("extra:") && workout?.definitions ? <label className="field">Choose another workout (optional)<select value={chosenDefinition || plannedDefinition} disabled={pending} onChange={(event) => setChosenDefinition(event.target.value)}>
            {!workout.definitions.some((definition) => definition.id === plannedDefinition) ? <option value={plannedDefinition}>{makeupSlot?.name ?? schedule?.next?.name}</option> : null}
            {workout.definitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.name}</option>)}
          </select></label> : null}
          {linkedWorkout && date !== linkedWorkout.date && selection !== "standalone" ? <p className="field-help">Select Standalone before saving a different date.</p> : null}
          {!sessionId && activeWorkout && activeWorkout.date !== date ? <p className="field-help">A workout is in progress on {activeWorkout.date}. Finish or discard it from its workout page before starting another.</p> : null}
        </div> : <input type="hidden" name="workoutSelection" value="standalone" />}
        {state.fieldErrors?.workoutSelection ? <p className="form-error" role="alert">{state.fieldErrors.workoutSelection[0]}</p> : null}
        <div className="set-editor">
          <div className="set-editor-header">
            <div>
              <h2>Sets</h2>
              <p className="field-help">Mark hard sets to separate working volume</p>
            </div>
            {!moveAddSetToActions ? (
              <button className="button-secondary" type="button" onClick={addSet}>
                Add set
              </button>
            ) : null}
          </div>
          {state.fieldErrors?.sets ? (
            <p className="form-error">{state.fieldErrors.sets[0]}</p>
          ) : null}
          <div className="set-list">
            {sets.map((set, index) => (
              <fieldset className="set-row" key={index}>
                <legend>Set {index + 1}</legend>
                <label>
                  Reps
                  <input
                    name={`sets.${index}.repetitions`}
                    type="number"
                    min="0.01"
                    max="999.99"
                    step="0.01"
                    value={set.repetitions}
                    onChange={(event) =>
                      updateSet(index, {
                        ...set,
                        repetitions: event.target.value,
                      })
                    }
                    required
                  />
                </label>
                <label>
                  kg
                  <input
                    name={`sets.${index}.kilograms`}
                    type="number"
                    min="0"
                    max="9999.99"
                    step="0.01"
                    value={set.kilograms}
                    onChange={(event) =>
                      updateSet(index, {
                        ...set,
                        kilograms: event.target.value,
                      })
                    }
                    required
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    name={`sets.${index}.isHard`}
                    type="checkbox"
                    checked={set.isHard}
                    onChange={(event) =>
                      updateSet(index, {
                        ...set,
                        isHard: event.target.checked,
                      })
                    }
                  />
                  Hard set
                </label>
                <button
                  className="text-button danger-text"
                  type="button"
                  onClick={() => removeSet(index)}
                  disabled={sets.length === 1}
                >
                  Remove
                </button>
              </fieldset>
            ))}
          </div>
        </div>
        {state.formError ? <p className="form-error">{state.formError}</p> : null}
        <div className="form-actions">
          {moveAddSetToActions ? (
            <button className="button-secondary" type="button" onClick={addSet}>
              Add set
            </button>
          ) : null}
          {showSubmitButton ? (
            <SubmitButton
              className="button"
              pendingLabel={sessionId ? "Saving…" : "Creating…"}
            >
              {submitLabel}
            </SubmitButton>
          ) : null}
        </div>
      </div>
      {footer}
    </form>
  );
}
