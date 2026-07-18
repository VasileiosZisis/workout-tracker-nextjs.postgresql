import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { requireUser } from "@/lib/auth";
import { createWeightliftingSessionAction } from "@/features/weightlifting/actions";
import { SessionSummary } from "@/features/weightlifting/components/session-summary";
import { WeightliftingSessionForm } from "@/features/weightlifting/components/weightlifting-session-form";
import { getLatestWeightliftingSession, getWeightliftingExerciseBySlug } from "@/features/weightlifting/queries";

export const metadata: Metadata = {
  title: "New Weightlifting Session",
};

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default async function NewWeightliftingSessionPage({
  params,
}: {
  params: Promise<{ logSlug: string; exerciseSlug: string }>;
}) {
  const user = await requireUser();
  const { logSlug, exerciseSlug } = await params;
  const exercise = await getWeightliftingExerciseBySlug({
    userId: user.id,
    logSlug,
    exerciseSlug,
  });

  if (!exercise) {
    notFound();
  }

  const previousSession = await getLatestWeightliftingSession({
    userId: user.id,
    exerciseId: exercise.id,
  });

  const exercisePath = `/logs/${exercise.log.slug}/exercises/${exercise.slug}`;

  return (
    <main className="page">
      <BackLink href={exercisePath}>New session</BackLink>
      <section className="page-header compact-header">
        <h1>Create weightlifting session</h1>
      </section>
      {previousSession ? (
        <section className="section-block">
          <h2>Previous session</h2>
          <SessionSummary session={previousSession} />
        </section>
      ) : null}
      <section className="section-block narrow">
        <WeightliftingSessionForm
          action={createWeightliftingSessionAction}
          defaultPerformedDate={todayDateInputValue()}
          exerciseId={exercise.id}
          moveAddSetToActions
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
