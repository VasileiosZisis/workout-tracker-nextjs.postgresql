import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { SessionSummary } from "@/features/weightlifting/components/session-summary";
import { formatSessionDate } from "@/features/weightlifting/format";
import { getWeightliftingSessionById } from "@/features/weightlifting/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const user = await requireUser();
  const { sessionId } = await params;
  const session = await getWeightliftingSessionById({
    userId: user.id,
    sessionId,
  });

  return {
    title: session
      ? `${session.exercise.title} ${formatSessionDate(session.performedAt)}`
      : "Weightlifting Session",
  };
}

export default async function WeightliftingSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  const { sessionId } = await params;
  const session = await getWeightliftingSessionById({
    userId: user.id,
    sessionId,
  });

  if (!session) {
    notFound();
  }

  const exercisePath = `/logs/${session.exercise.log.slug}/exercises/${session.exercise.slug}`;

  return (
    <main className="page">
      <Link className="text-link" href={exercisePath}>
        {session.exercise.title}
      </Link>
      <section className="page-header compact-header">
        <p className="eyebrow">Weightlifting session</p>
        <h1>{formatSessionDate(session.performedAt)}</h1>
        <p className="lede">Volume breakdown and set-level evidence.</p>
        <div className="actions">
          <Link
            className="button-secondary"
            href={`${exercisePath}/weightlifting/${session.id}/edit`}
          >
            Edit session
          </Link>
        </div>
      </section>
      <section className="section-block">
        <SessionSummary session={session} />
      </section>
    </main>
  );
}
