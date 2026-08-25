import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BackLink } from "@/components/back-link";
import { IntervalSessionSummary } from "@/features/interval/components/interval-session-summary";
import { formatSessionDate } from "@/features/interval/format";
import {
  getIntervalExerciseBySlug,
  getIntervalSessionById,
} from "@/features/interval/queries";
import { requireUser } from "@/lib/auth";

type IntervalSessionPageParams = {
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
  params: Promise<IntervalSessionPageParams>;
}): Promise<Metadata> {
  const { logSlug, exerciseSlug, sessionId } = await params;
  const session = await getRouteSession(logSlug, exerciseSlug, sessionId);

  return {
    title: session
      ? `${session.exercise.title} ${formatSessionDate(session.performedAt)}`
      : "Interval Session",
  };
}

export default async function IntervalSessionPage({
  params,
}: {
  params: Promise<IntervalSessionPageParams>;
}) {
  const { logSlug, exerciseSlug, sessionId } = await params;
  const session = await getRouteSession(logSlug, exerciseSlug, sessionId);

  if (!session) {
    notFound();
  }

  const exercisePath = `/logs/${session.exercise.log.slug}/exercises/${session.exercise.slug}`;

  return (
    <main className="page">
      <BackLink href={exercisePath}>Interval session</BackLink>
      <section className="page-header compact-header">
        <h1>{formatSessionDate(session.performedAt)}</h1>
        <div className="actions">
          <Link
            className="button-secondary"
            href={`${exercisePath}/interval/${session.id}/edit`}
          >
            Edit session
          </Link>
        </div>
      </section>
      <section className="section-block">
        <IntervalSessionSummary session={session} />
      </section>
    </main>
  );
}
