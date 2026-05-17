import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getExerciseBySlug } from "@/features/exercises/queries";
import { sessionKindLabels } from "@/features/exercises/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ logSlug: string; exerciseSlug: string }>;
}): Promise<Metadata> {
  const user = await requireUser();
  const { logSlug, exerciseSlug } = await params;
  const exercise = await getExerciseBySlug({
    userId: user.id,
    logSlug,
    exerciseSlug,
  });

  return {
    title: exercise?.title ?? "Exercise",
  };
}

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ logSlug: string; exerciseSlug: string }>;
}) {
  const user = await requireUser();
  const { logSlug, exerciseSlug } = await params;
  const exercise = await getExerciseBySlug({
    userId: user.id,
    logSlug,
    exerciseSlug,
  });

  if (!exercise) {
    notFound();
  }

  return (
    <main className="page">
      <Link className="text-link" href={`/logs/${exercise.log.slug}`}>
        {exercise.log.title}
      </Link>
      <section className="page-header compact-header">
        <p className="eyebrow">{sessionKindLabels[exercise.sessionKind]}</p>
        <h1>{exercise.title}</h1>
        <p className="lede">Sessions will be added in the next milestones.</p>
        <div className="actions">
          <Link
            className="button-secondary"
            href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/edit`}
          >
            Edit exercise
          </Link>
        </div>
      </section>
      <section className="empty-state section-block">
        <p>No sessions yet.</p>
      </section>
    </main>
  );
}
