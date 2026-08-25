"use client";

import { useActionState } from "react";
import type { IntervalActionState } from "../types";

type IntervalSessionFormProps = {
  action: (
    previousState: IntervalActionState,
    formData: FormData,
  ) => Promise<IntervalActionState>;
  defaultIncludeFinalRecovery?: boolean;
  defaultPerformedDate: string;
  defaultRecoveryMinutes?: number;
  defaultRecoverySecondsPart?: number;
  defaultRounds?: number;
  defaultWorkMinutes?: number;
  defaultWorkSecondsPart?: number;
  exerciseId?: string;
  formId?: string;
  sessionId?: string;
  showSubmitButton?: boolean;
  submitLabel: string;
};

const initialState: IntervalActionState = {};

export function IntervalSessionForm({
  action,
  defaultIncludeFinalRecovery = false,
  defaultPerformedDate,
  defaultRecoveryMinutes = 0,
  defaultRecoverySecondsPart = 1,
  defaultRounds = 2,
  defaultWorkMinutes = 0,
  defaultWorkSecondsPart = 1,
  exerciseId,
  formId,
  sessionId,
  showSubmitButton = true,
  submitLabel,
}: IntervalSessionFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      aria-busy={pending}
      className="form-stack form-panel"
      action={formAction}
      id={formId}
    >
      {exerciseId ? (
        <input name="exerciseId" type="hidden" value={exerciseId} />
      ) : null}
      {sessionId ? (
        <input name="sessionId" type="hidden" value={sessionId} />
      ) : null}
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
      <div className="field">
        <label htmlFor="rounds">Rounds</label>
        <input
          id="rounds"
          name="rounds"
          type="number"
          min="2"
          max="999"
          step="1"
          defaultValue={defaultRounds}
          required
        />
        {state.fieldErrors?.rounds ? (
          <p className="form-error">{state.fieldErrors.rounds[0]}</p>
        ) : null}
      </div>
      <fieldset className="field">
        <legend>Work per round</legend>
        <div className="inline-fields duration-fields">
          <label>
            Minutes
            <input
              name="workMinutes"
              type="number"
              min="0"
              max="999"
              step="1"
              defaultValue={defaultWorkMinutes}
              required
            />
          </label>
          <label>
            Seconds
            <input
              name="workSecondsPart"
              type="number"
              min="0"
              max="59"
              step="1"
              defaultValue={defaultWorkSecondsPart}
              required
            />
          </label>
        </div>
        {state.fieldErrors?.workMinutes ? (
          <p className="form-error">{state.fieldErrors.workMinutes[0]}</p>
        ) : null}
        {state.fieldErrors?.workSecondsPart ? (
          <p className="form-error">
            {state.fieldErrors.workSecondsPart[0]}
          </p>
        ) : null}
      </fieldset>
      <fieldset className="field">
        <legend>Recovery per round</legend>
        <div className="inline-fields duration-fields">
          <label>
            Minutes
            <input
              name="recoveryMinutes"
              type="number"
              min="0"
              max="999"
              step="1"
              defaultValue={defaultRecoveryMinutes}
              required
            />
          </label>
          <label>
            Seconds
            <input
              name="recoverySecondsPart"
              type="number"
              min="0"
              max="59"
              step="1"
              defaultValue={defaultRecoverySecondsPart}
              required
            />
          </label>
        </div>
        {state.fieldErrors?.recoveryMinutes ? (
          <p className="form-error">{state.fieldErrors.recoveryMinutes[0]}</p>
        ) : null}
        {state.fieldErrors?.recoverySecondsPart ? (
          <p className="form-error">
            {state.fieldErrors.recoverySecondsPart[0]}
          </p>
        ) : null}
      </fieldset>
      <div className="field">
        <label className="checkbox-row">
          <input
            name="includeFinalRecovery"
            type="checkbox"
            defaultChecked={defaultIncludeFinalRecovery}
          />
          Include recovery after final round
        </label>
        {state.fieldErrors?.includeFinalRecovery ? (
          <p className="form-error">
            {state.fieldErrors.includeFinalRecovery[0]}
          </p>
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
