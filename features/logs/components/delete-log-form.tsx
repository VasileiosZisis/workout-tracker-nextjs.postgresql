"use client";

import { useState } from "react";
import { deleteLogAction } from "../actions";

export function DeleteLogForm({ logId, title }: { logId: string; title: string }) {
  const [confirmation, setConfirmation] = useState("");
  const canDelete = confirmation === title;

  return (
    <form className="delete-confirmation" action={deleteLogAction}>
      <input name="logId" type="hidden" value={logId} />
      <label className="field">
        <span>Type the log name to confirm</span>
        <input
          aria-describedby="delete-log-help"
          autoComplete="off"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          type="text"
        />
      </label>
      <p id="delete-log-help">
        This removes the log, its exercises, and all recorded sessions.
      </p>
      <button className="danger-button" type="submit" disabled={!canDelete}>
        Confirm delete
      </button>
    </form>
  );
}
