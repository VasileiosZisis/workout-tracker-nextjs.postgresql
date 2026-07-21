"use client";

import { useActionState } from "react";
import type { PaceActionState } from "../types";

type PaceSessionFormProps = {
  action: (
    previousState: PaceActionState,
    formData: FormData,
  ) => Promise<PaceActionState>;
  defaultDistance?: string;
  defaultHours?: number;
  defaultMinutes?: number;
  defaultPerformedDate: string;
  defaultSeconds?: number;
  exerciseId?: string;
  formId?: string;
  sessionId?: string;
  showSubmitButton?: boolean;
  submitLabel: string;
};

const initialState: PaceActionState = {};

export function PaceSessionForm({
  action,
  defaultDistance = "0",
  defaultHours = 0,
  defaultMinutes = 0,
  defaultPerformedDate,
  defaultSeconds = 0,
  exerciseId,
  formId,
  sessionId,
  showSubmitButton = true,
  submitLabel,
}: PaceSessionFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form className="form-stack form-panel" action={formAction} id={formId}>
      {exerciseId ? <input name="exerciseId" type="hidden" value={exerciseId} /> : null}
      {sessionId ? <input name="sessionId" type="hidden" value={sessionId} /> : null}
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
      <fieldset className="field">
        <legend>Time</legend>
        <p className="field-help">Duration is used with distance to calculate pace.</p>
        <div className="inline-fields">
          <label>
            Hours
            <input
              name="hours"
              type="number"
              min="0"
              max="999"
              step="1"
              defaultValue={defaultHours}
              required
            />
          </label>
          <label>
            Minutes
            <input
              name="minutes"
              type="number"
              min="0"
              max="59"
              step="1"
              defaultValue={defaultMinutes}
              required
            />
          </label>
          <label>
            Seconds
            <input
              name="seconds"
              type="number"
              min="0"
              max="59"
              step="1"
              defaultValue={defaultSeconds}
              required
            />
          </label>
        </div>
        {state.fieldErrors?.hours ? (
          <p className="form-error">{state.fieldErrors.hours[0]}</p>
        ) : null}
        {state.fieldErrors?.minutes ? (
          <p className="form-error">{state.fieldErrors.minutes[0]}</p>
        ) : null}
        {state.fieldErrors?.seconds ? (
          <p className="form-error">{state.fieldErrors.seconds[0]}</p>
        ) : null}
      </fieldset>
      <div className="field">
        <label htmlFor="distance">Distance km</label>
        <input
          id="distance"
          name="distance"
          type="number"
          min="0"
          max="99999.99"
          step="0.01"
          defaultValue={defaultDistance}
          required
        />
        {state.fieldErrors?.distance ? (
          <p className="form-error">{state.fieldErrors.distance[0]}</p>
        ) : null}
      </div>
      {state.formError ? <p className="form-error">{state.formError}</p> : null}
      {showSubmitButton ? (
        <div className="form-actions">
          <button className="button" type="submit" disabled={pending}>
            {pending ? "Saving..." : submitLabel}
          </button>
        </div>
      ) : null}
    </form>
  );
}
