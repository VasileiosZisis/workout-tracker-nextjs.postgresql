"use client";

import { useId, useState } from "react";
import { FormTextField } from "@/components/form-text-field";
import type { SetupDraft } from "../setup-draft";
import { inlineExerciseSchema } from "../setup-schema";

export function DraftExerciseForm({ count, disabled, onCreate }: {
  count: number;
  disabled: boolean;
  onCreate: (exercise: SetupDraft["newExercises"][number]) => void;
}) {
  const titleId = useId();
  const [error, setError] = useState("");

  return (
    <form className="section-block narrow" onSubmit={(event) => {
      event.preventDefault();
      if (disabled) return;

      const form = event.currentTarget;
      const exercise = inlineExerciseSchema.safeParse({
        id: `new:${crypto.randomUUID()}`,
        title: new FormData(form).get("title"),
      });
      if (!exercise.success) {
        setError(exercise.error.issues[0].message);
        return;
      }
      if (count >= 100) {
        setError("Save your current exercises before creating more.");
        return;
      }

      onCreate(exercise.data);
      form.reset();
      setError("");
    }}>
      <div className="form-stack form-panel">
        <h2>Create exercise</h2>
        <FormTextField
          id={titleId}
          label="Title"
          name="title"
          maxLength={80}
          required
          disabled={disabled}
          help="This weightlifting exercise will be created when you save."
          error={error}
          onChange={() => setError("")}
        />
      </div>
      <div className="form-footer form-actions">
        <button type="submit" className="button" disabled={disabled}>Add to draft</button>
      </div>
    </form>
  );
}
