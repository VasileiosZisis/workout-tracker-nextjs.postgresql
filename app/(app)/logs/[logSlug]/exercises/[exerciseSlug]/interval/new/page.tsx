import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { createIntervalSessionAction } from "@/features/interval/actions";
import { IntervalSessionForm } from "@/features/interval/components/interval-session-form";
import { IntervalSessionSummary } from "@/features/interval/components/interval-session-summary";
import {
  getIntervalExerciseBySlug,
  getLatestIntervalSession,
} from "@/features/interval/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "New Interval Session",
};

const createSessionFormId = "create-interval-session-form";

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default async function NewIntervalSessionPage({
  params,
}: {
  params: Promise<{ logSlug: string; exerciseSlug: string }>;
}) {
  const user = await requireUser();
  const { logSlug, exerciseSlug } = await params;
  const exercise = await getIntervalExerciseBySlug({
    userId: user.id,
    logSlug,
    exerciseSlug,
  });

  if (!exercise) {
    notFound();
  }

  const previousSession = await getLatestIntervalSession({
    userId: user.id,
    exerciseId: exercise.id,
  });
  const exercisePath = `/logs/${exercise.log.slug}/exercises/${exercise.slug}`;

  return (
    <main className="page">
      <BackLink href={exercisePath}>New session</BackLink>
      <section className="page-header compact-header">
        <h1>{exercise.title}</h1>
      </section>
      {previousSession ? (
        <section className="section-block">
          <h2>Previous session</h2>
          <IntervalSessionSummary session={previousSession} />
        </section>
      ) : null}
      <section className="section-block narrow">
        <IntervalSessionForm
          action={createIntervalSessionAction}
          defaultPerformedDate={todayDateInputValue()}
          exerciseId={exercise.id}
          formId={createSessionFormId}
          showSubmitButton={false}
          submitLabel="Create session"
        />
        <div className="form-footer form-actions">
          <Link className="button-secondary" href={exercisePath}>
            Cancel
          </Link>
          <button className="button" form={createSessionFormId} type="submit">
            Create session
          </button>
        </div>
      </section>
    </main>
  );
}
