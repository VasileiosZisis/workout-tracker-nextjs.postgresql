"use client";

import { formatLocalDate } from "@/lib/local-date";
import { useEffect, useRef } from "react";

type PerformedDateInputProps = {
  defaultValue?: string;
  onDateChange?: (value: string) => void;
};

export function PerformedDateInput({ defaultValue, onDateChange }: PerformedDateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const edited = useRef(false);

  useEffect(() => {
    const input = inputRef.current;

    if (!input || initialized.current) {
      return;
    }

    initialized.current = true;

    if (defaultValue !== undefined || edited.current || input.value !== "") {
      // A browser-restored/autofilled date must also reach dependent selectors.
      if (input.value !== "") onDateChange?.(input.value);
      return;
    }

    const today = formatLocalDate(new Date());
    input.defaultValue = today;
    input.value = today;
    onDateChange?.(today);
  }, [defaultValue, onDateChange]);

  // Keep new-session defaults undefined so rerenders preserve the DOM default.
  return (
    <input
      ref={inputRef}
      id="performedDate"
      name="performedDate"
      type="date"
      defaultValue={defaultValue}
      onChange={(event) => {
        edited.current = true;
        onDateChange?.(event.target.value);
      }}
      required
    />
  );
}
