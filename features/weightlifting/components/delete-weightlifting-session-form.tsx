"use client";

import { FormCancelButton } from "@/components/form-cancel-button";
import { SubmitButton } from "@/components/submit-button";
import { useState } from "react";
import { deleteWeightliftingSessionAction } from "../actions";

export function DeleteWeightliftingSessionForm({
  sessionId,
}: {
  sessionId: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        className="danger-button"
        type="button"
        onClick={() => setConfirming(true)}
      >
        Delete session
      </button>
    );
  }

  return (
    <form className="delete-confirmation" action={deleteWeightliftingSessionAction}>
      <input name="sessionId" type="hidden" value={sessionId} />
      <p>This removes only this weightlifting session and its sets.</p>
      <div className="confirmation-actions">
        <FormCancelButton
          className="button-secondary"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </FormCancelButton>
        <SubmitButton className="danger-button" pendingLabel="Deleting…">
          Confirm delete
        </SubmitButton>
      </div>
    </form>
  );
}
