import Link from "next/link";
import type { ReactNode } from "react";

type CancelAction = { href: string } | { onClick: () => void; disabled?: boolean };

export function FormFooter({ cancel, children }: { cancel: CancelAction; children: ReactNode }) {
  return (
    <div className="form-footer form-actions">
      {"href" in cancel ? (
        <Link className="button-secondary" href={cancel.href}>Cancel</Link>
      ) : (
        <button className="button-secondary" type="button" disabled={cancel.disabled} onClick={cancel.onClick}>
          Cancel
        </button>
      )}
      {children}
    </div>
  );
}
