import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createExerciseAction } from "@/features/exercises/actions";
import { ExerciseForm } from "@/features/exercises/components/exercise-form";
import { getLogBySlug } from "@/features/logs/queries";

export const metadata: Metadata = {
  title: "New Exercise",
};

export default async function NewExercisePage({
  params,
}: {
  params: Promise<{ logSlug: string }>;
}) {
  const user = await requireUser();
  const { logSlug } = await params;
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });

  if (!log) {
    notFound();
  }

  return (
    <main className="page">
      <Link className="text-link" href={`/logs/${log.slug}`}>
        {log.title}
      </Link>
      <section className="page-header compact-header">
        <p className="eyebrow">New exercise</p>
        <h1>Create exercise</h1>
      </section>
      <section className="section-block narrow">
        <ExerciseForm
          action={createExerciseAction}
          logId={log.id}
          submitLabel="Create exercise"
        />
        <div className="form-footer">
          <Link className="button-secondary" href={`/logs/${log.slug}`}>
            Cancel
          </Link>
        </div>
      </section>
    </main>
  );
}
