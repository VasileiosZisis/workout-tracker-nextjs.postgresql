import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { requireUser } from "@/lib/auth";
import { updateExerciseAction } from "@/features/exercises/actions";
import { DeleteExerciseForm } from "@/features/exercises/components/delete-exercise-form";
import { ExerciseForm } from "@/features/exercises/components/exercise-form";
import {
  getExerciseBySlug,
  getExerciseForEditBySlug,
} from "@/features/exercises/queries";

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
  const exercise = await getExerciseForEditBySlug({
    userId: user.id,
    logSlug,
    exerciseSlug,
  });

  if (!exercise) {
    notFound();
  }

  const sessionKindLocked =
    exercise._count.intervalSessions > 0 ||
    exercise._count.paceSessions > 0 ||
    exercise._count.weightliftingSessions > 0;

  return (
    <main className="page">
      <BackLink href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}`}>
        Edit exercise
      </BackLink>
      <section className="page-header compact-header">
        <h1>Edit {exercise.title}</h1>
      </section>
      <section className="section-block narrow">
        <ExerciseForm
          action={updateExerciseAction}
          defaultSessionKind={exercise.sessionKind}
          defaultTitle={exercise.title}
          exerciseId={exercise.id}
          sessionKindLocked={sessionKindLocked}
          submitLabel="Save exercise"
          cancelHref={`/logs/${exercise.log.slug}/exercises/${exercise.slug}`}
        />
      </section>
      <section className="section-block narrow danger-zone">
        <h2>Delete exercise</h2>
        <p>Deleting an exercise cannot be undone.</p>
        <DeleteExerciseForm exerciseId={exercise.id} />
      </section>
    </main>
  );
}
