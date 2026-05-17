import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionKind } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { getExerciseBySlug } from "@/features/exercises/queries";
import { sessionKindLabels } from "@/features/exercises/types";
import { parsePagination } from "@/features/logs/pagination";
import { formatDecimal, formatSessionDate } from "@/features/weightlifting/format";
import { getWeightliftingSessionsPage } from "@/features/weightlifting/queries";

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
  searchParams,
}: {
  params: Promise<{ logSlug: string; exerciseSlug: string }>;
  searchParams: Promise<{ page?: string | string[]; limit?: string | string[] }>;
}) {
  const user = await requireUser();
  const { logSlug, exerciseSlug } = await params;
  const paginationInput = parsePagination(await searchParams);
  const exercise = await getExerciseBySlug({
    userId: user.id,
    logSlug,
    exerciseSlug,
  });

  if (!exercise) {
    notFound();
  }

  const weightliftingSessions =
    exercise.sessionKind === SessionKind.WEIGHTLIFTING
      ? await getWeightliftingSessionsPage({
          userId: user.id,
          exerciseId: exercise.id,
          page: paginationInput.page,
          limit: paginationInput.limit,
        })
      : null;

  return (
    <main className="page">
      <Link className="text-link" href={`/logs/${exercise.log.slug}`}>
        {exercise.log.title}
      </Link>
      <section className="page-header compact-header">
        <p className="eyebrow">{sessionKindLabels[exercise.sessionKind]}</p>
        <h1>{exercise.title}</h1>
        <p className="lede">Track sessions for this exercise.</p>
        <div className="actions">
          <Link
            className="button-secondary"
            href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/edit`}
          >
            Edit exercise
          </Link>
          {exercise.sessionKind === SessionKind.WEIGHTLIFTING ? (
            <Link
              className="button"
              href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/weightlifting/new`}
            >
              Add session
            </Link>
          ) : null}
        </div>
      </section>
      {exercise.sessionKind === SessionKind.WEIGHTLIFTING &&
      weightliftingSessions ? (
        weightliftingSessions.sessions.length === 0 ? (
          <section className="empty-state section-block">
            <p>No sessions yet.</p>
          </section>
        ) : (
          <>
            <section className="list section-block" aria-label="Sessions">
              {weightliftingSessions.sessions.map((session) => (
                <article className="list-item" key={session.id}>
                  <div>
                    <h2>
                      <Link
                        href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/weightlifting/${session.id}`}
                      >
                        {formatSessionDate(session.performedAt)}
                      </Link>
                    </h2>
                    <p>
                      Total {formatDecimal(session.totalVolume)} kg, working{" "}
                      {formatDecimal(session.workingVolume)} kg
                    </p>
                  </div>
                  <Link
                    className="text-link"
                    href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/weightlifting/${session.id}/edit`}
                  >
                    Edit
                  </Link>
                </article>
              ))}
            </section>
            <nav className="pagination" aria-label="Session pagination">
              <span>
                Page {weightliftingSessions.pagination.page} of{" "}
                {weightliftingSessions.pagination.totalPages}
              </span>
              <div>
                {weightliftingSessions.pagination.page > 1 ? (
                  <Link
                    className="text-link"
                    href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}?page=${
                      weightliftingSessions.pagination.page - 1
                    }`}
                  >
                    Previous
                  </Link>
                ) : null}
                {weightliftingSessions.pagination.page <
                weightliftingSessions.pagination.totalPages ? (
                  <Link
                    className="text-link"
                    href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}?page=${
                      weightliftingSessions.pagination.page + 1
                    }`}
                  >
                    Next
                  </Link>
                ) : null}
              </div>
            </nav>
          </>
        )
      ) : (
        <section className="empty-state section-block">
          <p>Pace sessions will be added in the next milestone.</p>
        </section>
      )}
    </main>
  );
}
