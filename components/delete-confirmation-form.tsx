"use client";

import { useId, useState, type ReactNode } from "react";
import { SubmitButton } from "@/components/submit-button";

export function DeleteConfirmationForm({ action, children, description, label, error, disabled }: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  description: string;
  label: string;
  error?: string;
  disabled?: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const helpId = useId();

  return (
    <form className="delete-confirmation" action={action}>
      {children}
      <label className="radio-row">
        <input
          type="checkbox"
          name="confirmed"
          value="yes"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          aria-describedby={helpId}
          required
        />
        {label}
      </label>
      <p id={helpId}>{description}</p>
      {error && <div className="form-error" role="alert">{error}</div>}
      <SubmitButton className="danger-button" pendingLabel="Deleting…" disabled={disabled || !confirmed}>
        Confirm delete
      </SubmitButton>
    </form>
  );
}
