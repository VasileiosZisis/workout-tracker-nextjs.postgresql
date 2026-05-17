import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { updateExerciseAction } from "@/features/exercises/actions";
import { DeleteExerciseForm } from "@/features/exercises/components/delete-exercise-form";
import { ExerciseForm } from "@/features/exercises/components/exercise-form";
import { getExerciseBySlug } from "@/features/exercises/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ logSlug: string; exerciseSlug: string }>;
}): Promise<Metadata> {
  const user = await requireUser();
  const { logSlug, exerciseSlug } = await params;
  const exercise = await getExerciseBySlug({
    userId: user.id,
    logSlug,
    exerciseSlug,
  });

  return {
    title: exercise ? `Edit ${exercise.title}` : "Edit Exercise",
  };
}

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ logSlug: string; exerciseSlug: string }>;
}) {
  const user = await requireUser();
  const { logSlug, exerciseSlug } = await params;
  const exercise = await getExerciseBySlug({
    userId: user.id,
    logSlug,
    exerciseSlug,
  });

  if (!exercise) {
    notFound();
  }

  return (
    <main className="page">
      <Link
        className="text-link"
        href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}`}
      >
        {exercise.title}
      </Link>
      <section className="page-header compact-header">
        <p className="eyebrow">Edit exercise</p>
        <h1>Edit {exercise.title}</h1>
      </section>
      <section className="section-block narrow">
        <ExerciseForm
          action={updateExerciseAction}
          defaultSessionKind={exercise.sessionKind}
          defaultTitle={exercise.title}
          exerciseId={exercise.id}
          submitLabel="Save exercise"
        />
        <div className="form-footer">
          <Link
            className="button-secondary"
            href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}`}
          >
            Cancel
          </Link>
        </div>
      </section>
      <section className="section-block narrow danger-zone">
        <h2>Delete exercise</h2>
        <p>Deleting an exercise cannot be undone.</p>
        <DeleteExerciseForm exerciseId={exercise.id} />
      </section>
    </main>
  );
}
