"use client";

import { deleteLogAction } from "../actions";

export function DeleteLogForm({ logId }: { logId: string }) {
  return (
    <form
      action={deleteLogAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this log?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="logId" type="hidden" value={logId} />
      <button className="danger-button" type="submit">
        Delete
      </button>
    </form>
  );
}
