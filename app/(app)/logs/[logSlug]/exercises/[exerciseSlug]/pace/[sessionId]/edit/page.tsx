import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { updatePaceSessionAction } from "@/features/pace/actions";
import { DeletePaceSessionForm } from "@/features/pace/components/delete-pace-session-form";
import { PaceSessionForm } from "@/features/pace/components/pace-session-form";
import { formatDecimal, formatSessionDate } from "@/features/pace/format";
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
      ? `Edit ${session.exercise.title} ${formatSessionDate(session.performedAt)}`
      : "Edit Pace Session",
  };
}

export default async function EditPaceSessionPage({
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
  const sessionPath = `${exercisePath}/pace/${session.id}`;

  return (
    <main className="page">
      <Link className="text-link" href={sessionPath}>
        {session.exercise.title}
      </Link>
      <section className="page-header compact-header">
        <p className="eyebrow">Edit session</p>
        <h1>{formatSessionDate(session.performedAt)}</h1>
      </section>
      <section className="section-block narrow">
        <PaceSessionForm
          action={updatePaceSessionAction}
          defaultDistance={formatDecimal(session.distance)}
          defaultHours={session.hours}
          defaultMinutes={session.minutes}
          defaultPerformedDate={formatSessionDate(session.performedAt)}
          defaultSeconds={session.seconds}
          sessionId={session.id}
          submitLabel="Save session"
        />
        <div className="form-footer">
          <Link className="button-secondary" href={sessionPath}>
            Cancel
          </Link>
        </div>
      </section>
      <section className="section-block narrow danger-zone">
        <h2>Delete session</h2>
        <p>Deleting a session cannot be undone.</p>
        <DeletePaceSessionForm sessionId={session.id} />
      </section>
    </main>
  );
}
