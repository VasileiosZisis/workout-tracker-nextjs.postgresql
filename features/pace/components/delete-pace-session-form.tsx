"use client";

import { FormCancelButton } from "@/components/form-cancel-button";
import { SubmitButton } from "@/components/submit-button";
import { useState } from "react";
import { deletePaceSessionAction } from "../actions";

export function DeletePaceSessionForm({ sessionId }: { sessionId: string }) {
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
    <form className="delete-confirmation" action={deletePaceSessionAction}>
      <input name="sessionId" type="hidden" value={sessionId} />
      <p>This removes only this pace session.</p>
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
