import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionKind } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { getExerciseBySlug } from "@/features/exercises/queries";
import { sessionKindLabels } from "@/features/exercises/types";
import { parsePagination } from "@/features/logs/pagination";
import {
  PaceProgressChart,
  WeightliftingProgressChart,
} from "@/features/progress/components/progress-charts";
import {
  getPaceProgressData,
  getWeightliftingProgressData,
} from "@/features/progress/queries";
import {
  formatDecimal as formatPaceDecimal,
  formatPace,
  formatSessionDate as formatPaceSessionDate,
} from "@/features/pace/format";
import { getPaceSessionsPage } from "@/features/pace/queries";
import {
  formatDecimal as formatWeightliftingDecimal,
  formatSessionDate as formatWeightliftingSessionDate,
} from "@/features/weightlifting/format";
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
  const weightliftingProgressData =
    exercise.sessionKind === SessionKind.WEIGHTLIFTING
      ? await getWeightliftingProgressData({
          userId: user.id,
          exerciseId: exercise.id,
        })
      : null;
  const paceSessions =
    exercise.sessionKind === SessionKind.PACE
      ? await getPaceSessionsPage({
          userId: user.id,
          exerciseId: exercise.id,
          page: paginationInput.page,
          limit: paginationInput.limit,
        })
      : null;
  const paceProgressData =
    exercise.sessionKind === SessionKind.PACE
      ? await getPaceProgressData({
          userId: user.id,
          exerciseId: exercise.id,
        })
      : null;
  const latestWeightliftingSession = weightliftingSessions?.sessions[0] ?? null;
  const latestPaceSession = paceSessions?.sessions[0] ?? null;

  return (
    <main className="page">
      <Link className="text-link" href={`/logs/${exercise.log.slug}`}>
        {exercise.log.title}
      </Link>
      <section className="page-header compact-header">
        <p className="eyebrow">{sessionKindLabels[exercise.sessionKind]}</p>
        <h1>{exercise.title}</h1>
        <p className="lede">Read the latest evidence before adding the next session.</p>
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
          {exercise.sessionKind === SessionKind.PACE ? (
            <Link
              className="button"
              href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/pace/new`}
            >
              Add session
            </Link>
          ) : null}
        </div>
      </section>
      {exercise.sessionKind === SessionKind.WEIGHTLIFTING &&
      weightliftingSessions &&
      weightliftingProgressData ? (
        weightliftingSessions.sessions.length === 0 ? (
          <>
            <WeightliftingProgressChart data={weightliftingProgressData} />
            <section className="empty-state section-block">
              <p>No sessions yet. Add a session to start tracking working volume.</p>
            </section>
          </>
        ) : (
          <>
            <section className="section-block evidence-strip" aria-label="Latest evidence">
              <div className="metric-card metric-card-lime">
                <span>Latest working volume</span>
                <strong>
                  {latestWeightliftingSession
                    ? `${formatWeightliftingDecimal(
                        latestWeightliftingSession.workingVolume,
                      )} kg`
                    : "0 kg"}
                </strong>
              </div>
              <div className="metric-card metric-card-amber">
                <span>Hard sets</span>
                <strong>{latestWeightliftingSession?._count.sets ?? 0}</strong>
              </div>
              <div className="metric-card metric-card-violet">
                <span>Total volume</span>
                <strong>
                  {latestWeightliftingSession
                    ? `${formatWeightliftingDecimal(
                        latestWeightliftingSession.totalVolume,
                      )} kg`
                    : "0 kg"}
                </strong>
              </div>
            </section>
            <WeightliftingProgressChart data={weightliftingProgressData} />
            <section className="section-block">
              <div className="section-heading">
                <h2>Session history</h2>
              </div>
              <div className="list evidence-list" aria-label="Sessions">
              {weightliftingSessions.sessions.map((session) => (
                <article className="list-item session-card" key={session.id}>
                  <div>
                    <h2>
                      <Link
                        href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/weightlifting/${session.id}`}
                      >
                        {formatWeightliftingSessionDate(session.performedAt)}
                      </Link>
                    </h2>
                    <div className="session-metrics">
                      <span className="metric-pill metric-pill-lime">
                        Working {formatWeightliftingDecimal(session.workingVolume)} kg
                      </span>
                      <span className="metric-pill metric-pill-amber">
                        Hard sets {session._count.sets}
                      </span>
                      <span className="metric-pill metric-pill-violet">
                        Total {formatWeightliftingDecimal(session.totalVolume)} kg
                      </span>
                    </div>
                  </div>
                  <Link
                    className="text-link"
                    href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/weightlifting/${session.id}/edit`}
                  >
                    Edit
                  </Link>
                </article>
              ))}
              </div>
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
      ) : exercise.sessionKind === SessionKind.PACE &&
        paceSessions &&
        paceProgressData ? (
        paceSessions.sessions.length === 0 ? (
          <>
            <PaceProgressChart data={paceProgressData} />
            <section className="empty-state section-block">
              <p>No sessions yet. Add a session to start tracking pace.</p>
            </section>
          </>
        ) : (
          <>
            <section className="section-block evidence-strip" aria-label="Latest evidence">
              <div className="metric-card metric-card-blue">
                <span>Latest pace</span>
                <strong>
                  {latestPaceSession && Number(latestPaceSession.pace) !== 0
                    ? formatPace({
                        paceMinutes: latestPaceSession.paceMinutes,
                        paceSeconds: latestPaceSession.paceSeconds,
                      })
                    : "0 min/km"}
                </strong>
              </div>
              <div className="metric-card metric-card-lime">
                <span>Distance</span>
                <strong>
                  {latestPaceSession
                    ? `${formatPaceDecimal(latestPaceSession.distance)} km`
                    : "0 km"}
                </strong>
              </div>
              <div className="metric-card metric-card-violet">
                <span>Speed</span>
                <strong>
                  {latestPaceSession
                    ? `${formatPaceDecimal(latestPaceSession.speed)} km/h`
                    : "0 km/h"}
                </strong>
              </div>
            </section>
            <PaceProgressChart data={paceProgressData} />
            <section className="section-block">
              <div className="section-heading">
                <h2>Session history</h2>
              </div>
              <div className="list evidence-list" aria-label="Sessions">
              {paceSessions.sessions.map((session) => (
                <article className="list-item session-card" key={session.id}>
                  <div>
                    <h2>
                      <Link
                        href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/pace/${session.id}`}
                      >
                        {formatPaceSessionDate(session.performedAt)}
                      </Link>
                    </h2>
                    <div className="session-metrics">
                      <span className="metric-pill metric-pill-blue">
                        Pace{" "}
                        {Number(session.pace) === 0
                          ? "0 min/km"
                          : formatPace({
                              paceMinutes: session.paceMinutes,
                              paceSeconds: session.paceSeconds,
                            })}
                      </span>
                      <span className="metric-pill metric-pill-lime">
                        {formatPaceDecimal(session.distance)} km
                      </span>
                      <span className="metric-pill metric-pill-violet">
                        {formatPaceDecimal(session.speed)} km/h
                      </span>
                    </div>
                  </div>
                  <Link
                    className="text-link"
                    href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/pace/${session.id}/edit`}
                  >
                    Edit
                  </Link>
                </article>
              ))}
              </div>
            </section>
            <nav className="pagination" aria-label="Session pagination">
              <span>
                Page {paceSessions.pagination.page} of{" "}
                {paceSessions.pagination.totalPages}
              </span>
              <div>
                {paceSessions.pagination.page > 1 ? (
                  <Link
                    className="text-link"
                    href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}?page=${
                      paceSessions.pagination.page - 1
                    }`}
                  >
                    Previous
                  </Link>
                ) : null}
                {paceSessions.pagination.page < paceSessions.pagination.totalPages ? (
                  <Link
                    className="text-link"
                    href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}?page=${
                      paceSessions.pagination.page + 1
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
          <p>No sessions yet.</p>
        </section>
      )}
    </main>
  );
}
