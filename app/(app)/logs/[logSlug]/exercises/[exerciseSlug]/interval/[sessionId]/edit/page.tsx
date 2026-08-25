import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BackLink } from "@/components/back-link";
import { updateIntervalSessionAction } from "@/features/interval/actions";
import { DeleteIntervalSessionForm } from "@/features/interval/components/delete-interval-session-form";
import { IntervalSessionForm } from "@/features/interval/components/interval-session-form";
import { formatSessionDate } from "@/features/interval/format";
import {
  getIntervalExerciseBySlug,
  getIntervalSessionById,
} from "@/features/interval/queries";
import { requireUser } from "@/lib/auth";

const editSessionFormId = "edit-interval-session-form";

type EditIntervalSessionPageParams = {
  logSlug: string;
  exerciseSlug: string;
  sessionId: string;
};

const getRouteSession = cache(async function getRouteSession(
  logSlug: string,
  exerciseSlug: string,
  sessionId: string,
) {
  const user = await requireUser();
  const exercise = await getIntervalExerciseBySlug({
    userId: user.id,
    logSlug,
    exerciseSlug,
  });

  if (!exercise) {
    return null;
  }

  return getIntervalSessionById({
    userId: user.id,
    exerciseId: exercise.id,
    sessionId,
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<EditIntervalSessionPageParams>;
}): Promise<Metadata> {
  const { logSlug, exerciseSlug, sessionId } = await params;
  const session = await getRouteSession(logSlug, exerciseSlug, sessionId);

  return {
    title: session
      ? `Edit ${session.exercise.title} ${formatSessionDate(session.performedAt)}`
      : "Edit Interval Session",
  };
}

export default async function EditIntervalSessionPage({
  params,
}: {
  params: Promise<EditIntervalSessionPageParams>;
}) {
  const { logSlug, exerciseSlug, sessionId } = await params;
  const session = await getRouteSession(logSlug, exerciseSlug, sessionId);

  if (!session) {
    notFound();
  }

  const exercisePath = `/logs/${session.exercise.log.slug}/exercises/${session.exercise.slug}`;
  const sessionPath = `${exercisePath}/interval/${session.id}`;

  return (
    <main className="page">
      <BackLink href={sessionPath}>Edit session</BackLink>
      <section className="page-header compact-header">
        <h1>{formatSessionDate(session.performedAt)}</h1>
      </section>
      <section className="section-block narrow">
        <IntervalSessionForm
          action={updateIntervalSessionAction}
          defaultIncludeFinalRecovery={session.includeFinalRecovery}
          defaultPerformedDate={formatSessionDate(session.performedAt)}
          defaultRecoveryMinutes={Math.floor(session.recoverySeconds / 60)}
          defaultRecoverySecondsPart={session.recoverySeconds % 60}
          defaultRounds={session.rounds}
          defaultWorkMinutes={Math.floor(session.workSeconds / 60)}
          defaultWorkSecondsPart={session.workSeconds % 60}
          formId={editSessionFormId}
          sessionId={session.id}
          showSubmitButton={false}
          submitLabel="Save session"
        />
        <div className="form-footer form-actions">
          <Link className="button-secondary" href={sessionPath}>
            Cancel
          </Link>
          <button className="button" form={editSessionFormId} type="submit">
            Save session
          </button>
        </div>
      </section>
      <section className="section-block narrow danger-zone">
        <h2>Delete session</h2>
        <p>Deleting a session cannot be undone.</p>
        <DeleteIntervalSessionForm sessionId={session.id} />
      </section>
    </main>
  );
}
