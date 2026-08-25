"use client";

import { useState } from "react";
import { deleteIntervalSessionAction } from "../actions";

export function DeleteIntervalSessionForm({
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
    <form className="delete-confirmation" action={deleteIntervalSessionAction}>
      <input name="sessionId" type="hidden" value={sessionId} />
      <p>This removes only this interval session.</p>
      <div className="confirmation-actions">
        <button
          className="button-secondary"
          type="button"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
        <button className="danger-button" type="submit">
          Confirm delete
        </button>
      </div>
    </form>
  );
}
