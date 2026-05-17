import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PaceSessionSummary } from "@/features/pace/components/pace-session-summary";
import { formatSessionDate } from "@/features/pace/format";
import { getPaceSessionById } from "@/features/pace/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const user = await requireUser();
  const { sessionId } = await params;
  const session = await getPaceSessionById({
    userId: user.id,
    sessionId,
  });

  return {
    title: session
      ? `${session.exercise.title} ${formatSessionDate(session.performedAt)}`
      : "Pace Session",
  };
}

export default async function PaceSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  const { sessionId } = await params;
  const session = await getPaceSessionById({
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
        <p className="eyebrow">Pace session</p>
        <h1>{formatSessionDate(session.performedAt)}</h1>
        <div className="actions">
          <Link
            className="button-secondary"
            href={`${exercisePath}/pace/${session.id}/edit`}
          >
            Edit session
          </Link>
        </div>
      </section>
      <section className="section-block">
        <PaceSessionSummary session={session} />
      </section>
    </main>
  );
}
