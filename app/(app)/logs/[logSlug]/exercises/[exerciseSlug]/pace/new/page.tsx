import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createPaceSessionAction } from "@/features/pace/actions";
import { PaceSessionForm } from "@/features/pace/components/pace-session-form";
import { PaceSessionSummary } from "@/features/pace/components/pace-session-summary";
import {
  getLatestPaceSession,
  getPaceExerciseBySlug,
} from "@/features/pace/queries";

export const metadata: Metadata = {
  title: "New Pace Session",
};

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default async function NewPaceSessionPage({
  params,
}: {
  params: Promise<{ logSlug: string; exerciseSlug: string }>;
}) {
  const user = await requireUser();
  const { logSlug, exerciseSlug } = await params;
  const exercise = await getPaceExerciseBySlug({
    userId: user.id,
    logSlug,
    exerciseSlug,
  });

  if (!exercise) {
    notFound();
  }

  const previousSession = await getLatestPaceSession({
    userId: user.id,
    exerciseId: exercise.id,
  });

  const exercisePath = `/logs/${exercise.log.slug}/exercises/${exercise.slug}`;

  return (
    <main className="page">
      <Link className="text-link" href={exercisePath}>
        {exercise.title}
      </Link>
      <section className="page-header compact-header">
        <p className="eyebrow">New session</p>
        <h1>Create pace session</h1>
      </section>
      {previousSession ? (
        <section className="section-block">
          <h2>Previous session</h2>
          <PaceSessionSummary session={previousSession} />
        </section>
      ) : null}
      <section className="section-block narrow">
        <PaceSessionForm
          action={createPaceSessionAction}
          defaultPerformedDate={todayDateInputValue()}
          exerciseId={exercise.id}
          submitLabel="Create session"
        />
        <div className="form-footer">
          <Link className="button-secondary" href={exercisePath}>
            Cancel
          </Link>
        </div>
      </section>
    </main>
  );
}
