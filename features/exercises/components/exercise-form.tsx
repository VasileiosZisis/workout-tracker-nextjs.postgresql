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
    <form className="form-stack" action={formAction}>
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
        {state.fieldErrors?.title ? (
          <p className="form-error">{state.fieldErrors.title[0]}</p>
        ) : null}
      </div>
      <fieldset className="field">
        <legend>Session type</legend>
        {Object.values(SessionKind).map((sessionKind) => (
          <label className="radio-row" key={sessionKind}>
            <input
              type="radio"
              name="sessionKind"
              value={sessionKind}
              defaultChecked={sessionKind === defaultSessionKind}
            />
            {sessionKindLabels[sessionKind]}
          </label>
        ))}
        {state.fieldErrors?.sessionKind ? (
          <p className="form-error">{state.fieldErrors.sessionKind[0]}</p>
        ) : null}
      </fieldset>
      {state.formError ? <p className="form-error">{state.formError}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
