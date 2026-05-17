import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { getExercisesForLog } from "@/features/exercises/queries";
import { sessionKindLabels } from "@/features/exercises/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ logSlug: string }>;
}): Promise<Metadata> {
  const user = await requireUser();
  const { logSlug } = await params;
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });

  return {
    title: log?.title ?? "Log",
  };
}

export default async function LogDetailPage({
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

  const exercises = await getExercisesForLog({
    userId: user.id,
    logId: log.id,
  });

  return (
    <main className="page">
      <Link className="text-link" href="/logs">
        Logs
      </Link>
      <section className="page-header compact-header">
        <p className="eyebrow">Exercise library</p>
        <h1>{log.title}</h1>
        <p className="lede">Choose the movement or activity you want to measure.</p>
        <div className="actions">
          <Link className="button-secondary" href={`/logs/${log.slug}/edit`}>
            Edit log
          </Link>
          <Link className="button" href={`/logs/${log.slug}/exercises/new`}>
            Add exercise
          </Link>
        </div>
      </section>
      {exercises.length === 0 ? (
        <section className="empty-state section-block">
          <div>
            <h2>No exercises yet</h2>
            <p>Add one to start collecting sessions.</p>
          </div>
          <Link className="button" href={`/logs/${log.slug}/exercises/new`}>
            Add exercise
          </Link>
        </section>
      ) : (
        <section className="list section-block evidence-list" aria-label="Exercises">
          {exercises.map((exercise) => (
            <article className="list-item session-card" key={exercise.id}>
              <div>
                <h2>
                  <Link href={`/logs/${log.slug}/exercises/${exercise.slug}`}>
                    {exercise.title}
                  </Link>
                </h2>
                <p>
                  <span className="metric-pill">
                    {sessionKindLabels[exercise.sessionKind]}
                  </span>
                </p>
              </div>
              <Link
                className="text-link"
                href={`/logs/${log.slug}/exercises/${exercise.slug}/edit`}
              >
                Edit
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
