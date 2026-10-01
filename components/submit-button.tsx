"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = ComponentProps<"button"> & {
  pendingLabel: string;
};

export function SubmitButton({
  children,
  disabled,
  pendingLabel,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
