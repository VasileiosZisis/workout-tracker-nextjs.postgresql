"use client";

import { SubmitButton } from "@/components/submit-button";
import { FormFooter } from "@/components/form-footer";
import { FormTextField } from "@/components/form-text-field";
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
  cancelHref: string;
};

const initialState: LogActionState = {};

export function LogForm({
  action,
  defaultTitle = "",
  logId,
  submitLabel,
  cancelHref,
}: LogFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form aria-busy={pending} action={formAction}>
      <div className="form-stack form-panel">
        {logId ? <input name="logId" type="hidden" value={logId} /> : null}
        <FormTextField
          id="title"
          label="Title"
          name="title"
          defaultValue={defaultTitle}
          required
          maxLength={80}
          help="Use a plan, phase, or measurable training goal."
          error={state.fieldErrors?.title?.[0]}
        />
        {state.formError ? <p className="form-error">{state.formError}</p> : null}
      </div>
      <FormFooter cancel={{ href: cancelHref }}>
        <SubmitButton
          className="button"
          pendingLabel={logId ? "Saving…" : "Creating…"}
        >
          {submitLabel}
        </SubmitButton>
      </FormFooter>
    </form>
  );
}
