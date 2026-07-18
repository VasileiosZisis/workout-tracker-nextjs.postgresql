"use client";

import { useActionState, useState } from "react";
import type { WeightliftingActionState, WeightliftingFormSet } from "../types";

type WeightliftingSessionFormProps = {
  action: (
    previousState: WeightliftingActionState,
    formData: FormData,
  ) => Promise<WeightliftingActionState>;
  defaultPerformedDate: string;
  defaultSets?: WeightliftingFormSet[];
  exerciseId?: string;
  moveAddSetToActions?: boolean;
  sessionId?: string;
  submitLabel: string;
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
  moveAddSetToActions = false,
  sessionId,
  submitLabel,
}: WeightliftingSessionFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [sets, setSets] = useState<WeightliftingFormSet[]>(
    defaultSets.length > 0 ? defaultSets : [emptySet],
  );

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
    <form className="form-stack form-panel" action={formAction}>
      {exerciseId ? <input name="exerciseId" type="hidden" value={exerciseId} /> : null}
      {sessionId ? <input name="sessionId" type="hidden" value={sessionId} /> : null}
      <input name="setCount" type="hidden" value={sets.length} />
      <div className="field">
        <label htmlFor="performedDate">Date</label>
        <input
          id="performedDate"
          name="performedDate"
          type="date"
          defaultValue={defaultPerformedDate}
          required
        />
        {state.fieldErrors?.performedDate ? (
          <p className="form-error">{state.fieldErrors.performedDate[0]}</p>
        ) : null}
      </div>
      <div className="set-editor">
        <div className="set-editor-header">
          <div>
            <h2>Sets</h2>
            <p className="field-help">Mark hard sets to separate working volume.</p>
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
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
