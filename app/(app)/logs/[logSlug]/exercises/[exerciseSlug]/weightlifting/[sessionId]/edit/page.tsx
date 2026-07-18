import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { requireUser } from "@/lib/auth";
import { updateWeightliftingSessionAction } from "@/features/weightlifting/actions";
import { DeleteWeightliftingSessionForm } from "@/features/weightlifting/components/delete-weightlifting-session-form";
import { WeightliftingSessionForm } from "@/features/weightlifting/components/weightlifting-session-form";
import { formatDecimal, formatSessionDate } from "@/features/weightlifting/format";
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
      ? `Edit ${session.exercise.title} ${formatSessionDate(session.performedAt)}`
      : "Edit Weightlifting Session",
  };
}

export default async function EditWeightliftingSessionPage({
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
  const sessionPath = `${exercisePath}/weightlifting/${session.id}`;

  return (
    <main className="page">
      <BackLink href={sessionPath}>Edit session</BackLink>
      <section className="page-header compact-header">
        <h1>{formatSessionDate(session.performedAt)}</h1>
      </section>
      <section className="section-block narrow">
        <WeightliftingSessionForm
          action={updateWeightliftingSessionAction}
          defaultPerformedDate={formatSessionDate(session.performedAt)}
          defaultSets={session.sets.map((set) => ({
            repetitions: formatDecimal(set.repetitions),
            kilograms: formatDecimal(set.kilograms),
            isHard: set.isHard,
          }))}
          moveAddSetToActions
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
        <DeleteWeightliftingSessionForm sessionId={session.id} />
      </section>
    </main>
  );
}
