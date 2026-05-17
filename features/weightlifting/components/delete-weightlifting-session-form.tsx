"use client";

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
        <button className="button-secondary" type="button" onClick={() => setConfirming(false)}>
          Cancel
        </button>
        <button className="danger-button" type="submit">
          Confirm delete
        </button>
      </div>
    </form>
  );
}
