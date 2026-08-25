"use client";

import { SessionKind } from "@/generated/prisma/enums";
import type { ExerciseActionState } from "../types";
import { sessionKindLabels } from "../types";
import { useActionState } from "react";

type ExerciseFormProps = {
  action: (
    previousState: ExerciseActionState,
    formData: FormData,
  ) => Promise<ExerciseActionState>;
  defaultSessionKind?: SessionKind;
  defaultTitle?: string;
  exerciseId?: string;
  logId?: string;
  sessionKindLocked?: boolean;
  submitLabel: string;
};

const initialState: ExerciseActionState = {};

export function ExerciseForm({
  action,
  defaultSessionKind = "WEIGHTLIFTING",
  defaultTitle = "",
  exerciseId,
  logId,
  sessionKindLocked = false,
  submitLabel,
}: ExerciseFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form className="form-stack form-panel" action={formAction}>
      {logId ? <input name="logId" type="hidden" value={logId} /> : null}
      {exerciseId ? (
        <input name="exerciseId" type="hidden" value={exerciseId} />
      ) : null}
      {sessionKindLocked ? (
        <input name="sessionKind" type="hidden" value={defaultSessionKind} />
      ) : null}
      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={defaultTitle}
          required
          maxLength={80}
        />
        <p className="field-help">Name the movement or activity you want to measure.</p>
        {state.fieldErrors?.title ? (
          <p className="form-error">{state.fieldErrors.title[0]}</p>
        ) : null}
      </div>
      <fieldset className="field">
        <legend>Session type</legend>
        <div className="radio-grid">
          {Object.values(SessionKind).map((sessionKind) => (
            <label className="radio-row radio-option" key={sessionKind}>
              <input
                type="radio"
                name="sessionKind"
                value={sessionKind}
                defaultChecked={sessionKind === defaultSessionKind}
                disabled={sessionKindLocked}
              />
              {sessionKindLabels[sessionKind]}
            </label>
          ))}
        </div>
        {sessionKindLocked ? (
          <p className="field-help">
            Session type is locked after the first session is added.
          </p>
        ) : null}
        {state.fieldErrors?.sessionKind ? (
          <p className="form-error">{state.fieldErrors.sessionKind[0]}</p>
        ) : null}
      </fieldset>
      {state.formError ? <p className="form-error">{state.formError}</p> : null}
      <div className="form-actions">
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
