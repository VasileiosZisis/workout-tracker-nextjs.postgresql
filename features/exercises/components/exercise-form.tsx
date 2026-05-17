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
  submitLabel: string;
};

const initialState: ExerciseActionState = {};

export function ExerciseForm({
  action,
  defaultSessionKind = "WEIGHTLIFTING",
  defaultTitle = "",
  exerciseId,
  logId,
  submitLabel,
}: ExerciseFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form className="form-stack form-panel" action={formAction}>
      {logId ? <input name="logId" type="hidden" value={logId} /> : null}
      {exerciseId ? (
        <input name="exerciseId" type="hidden" value={exerciseId} />
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
              />
              {sessionKindLabels[sessionKind]}
            </label>
          ))}
        </div>
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
