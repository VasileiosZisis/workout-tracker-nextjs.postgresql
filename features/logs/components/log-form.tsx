"use client";

import type { LogActionState } from "../types";
import { useActionState } from "react";

type LogFormProps = {
  action: (
    previousState: LogActionState,
    formData: FormData,
  ) => Promise<LogActionState>;
  defaultTitle?: string;
  logId?: string;
  submitLabel: string;
};

const initialState: LogActionState = {};

export function LogForm({
  action,
  defaultTitle = "",
  logId,
  submitLabel,
}: LogFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form className="form-stack" action={formAction}>
      {logId ? <input name="logId" type="hidden" value={logId} /> : null}
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
      {state.formError ? <p className="form-error">{state.formError}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

