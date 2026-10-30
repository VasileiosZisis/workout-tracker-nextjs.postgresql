import { SubmitButton } from "@/components/submit-button";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { createIntervalSessionAction } from "@/features/interval/actions";
import { IntervalSessionForm } from "@/features/interval/components/interval-session-form";
import { IntervalSessionSummary } from "@/features/interval/components/interval-session-summary";
import { formatSessionDate } from "@/features/interval/format";
import {
  getIntervalExerciseBySlug,
  getLatestIntervalSession,
} from "@/features/interval/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "New Interval Session",
};

const createSessionFormId = "create-interval-session-form";

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
        <section className="section-block session-reference">
          <h2 className="session-reference-date">
            <time dateTime={formatSessionDate(previousSession.performedAt)}>
              {formatSessionDate(previousSession.performedAt)}
            </time>
          </h2>
          <IntervalSessionSummary session={previousSession} variant="compact" />
        </section>
      ) : null}
      <section className="section-block narrow">
        <IntervalSessionForm
          action={createIntervalSessionAction}
          exerciseId={exercise.id}
          formId={createSessionFormId}
          showSubmitButton={false}
          submitLabel="Create session"
          footer={
            <div className="form-footer form-actions">
              <Link className="button-secondary" href={exercisePath}>
                Cancel
              </Link>
              <SubmitButton className="button" pendingLabel="Creating…">
                Create session
              </SubmitButton>
            </div>
          }
        />
      </section>
    </main>
  );
}
