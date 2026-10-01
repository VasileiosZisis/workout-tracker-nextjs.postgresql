"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

export function FormCancelButton({ disabled, ...props }: ComponentProps<"button">) {
  const { pending } = useFormStatus();

  return <button {...props} type="button" disabled={disabled || pending} />;
}
