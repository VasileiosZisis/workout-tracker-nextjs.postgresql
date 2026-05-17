"use client";

import { deletePaceSessionAction } from "../actions";

export function DeletePaceSessionForm({ sessionId }: { sessionId: string }) {
  return (
    <form
      action={deletePaceSessionAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this session?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="sessionId" type="hidden" value={sessionId} />
      <button className="danger-button" type="submit">
        Delete
      </button>
    </form>
  );
}
