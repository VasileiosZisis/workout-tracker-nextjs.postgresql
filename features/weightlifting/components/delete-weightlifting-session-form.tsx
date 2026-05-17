"use client";

import { deleteWeightliftingSessionAction } from "../actions";

export function DeleteWeightliftingSessionForm({
  sessionId,
}: {
  sessionId: string;
}) {
  return (
    <form
      action={deleteWeightliftingSessionAction}
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
