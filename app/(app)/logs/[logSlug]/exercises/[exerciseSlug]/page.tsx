import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionKind } from "@/generated/prisma/enums";
import { BackLink } from "@/components/back-link";
import { PaginationNav } from "@/components/pagination-nav";
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
import { parseChartRangeSearchParams } from "@/features/progress/date-range";
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
  searchParams: Promise<{
    chartFrom?: string | string[];
    chartRange?: string | string[];
    chartTo?: string | string[];
    page?: string | string[];
    limit?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const { logSlug, exerciseSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const paginationInput = parsePagination(resolvedSearchParams);
  const chartRange = parseChartRangeSearchParams(resolvedSearchParams);
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
          chartRange,
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
          chartRange,
          userId: user.id,
          exerciseId: exercise.id,
        })
      : null;
  const latestWeightliftingSession = weightliftingSessions?.sessions[0] ?? null;
  const latestPaceSession = paceSessions?.sessions[0] ?? null;

  return (
    <main className="page">
      <BackLink href={`/logs/${exercise.log.slug}`}>
        {sessionKindLabels[exercise.sessionKind]}
      </BackLink>
      <section className="page-header compact-header">
        <h1>{exercise.title}</h1>
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
            <WeightliftingProgressChart
              data={weightliftingProgressData}
              range={chartRange}
            />
            <section className="empty-state section-block">
              <div>
                <h2>No sessions yet</h2>
                <p>Add a session to start tracking working volume.</p>
              </div>
              <Link
                className="button"
                href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/weightlifting/new`}
              >
                Add session
              </Link>
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
            <WeightliftingProgressChart
              data={weightliftingProgressData}
              range={chartRange}
            />
            <section className="section-block">
              <div className="section-heading">
                <h2>Session history</h2>
              </div>
              <PaginationNav
                ariaLabel="Session pagination"
                baseHref={`/logs/${exercise.log.slug}/exercises/${exercise.slug}`}
                limit={weightliftingSessions.pagination.limit}
                page={weightliftingSessions.pagination.page}
                placement="top"
                totalItems={weightliftingSessions.pagination.totalItems}
                totalPages={weightliftingSessions.pagination.totalPages}
              />
              <div className="list evidence-list" aria-label="Sessions">
              {weightliftingSessions.sessions.map((session) => (
                <Link
                  className="list-item session-card"
                  href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/weightlifting/${session.id}`}
                  key={session.id}
                >
                  <div>
                    <h2>{formatWeightliftingSessionDate(session.performedAt)}</h2>
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
                </Link>
              ))}
              </div>
            </section>
            <PaginationNav
              ariaLabel="Session pagination"
              baseHref={`/logs/${exercise.log.slug}/exercises/${exercise.slug}`}
              limit={weightliftingSessions.pagination.limit}
              page={weightliftingSessions.pagination.page}
              placement="bottom"
              totalItems={weightliftingSessions.pagination.totalItems}
              totalPages={weightliftingSessions.pagination.totalPages}
            />
          </>
        )
      ) : exercise.sessionKind === SessionKind.PACE &&
        paceSessions &&
        paceProgressData ? (
        paceSessions.sessions.length === 0 ? (
          <>
            <PaceProgressChart data={paceProgressData} range={chartRange} />
            <section className="empty-state section-block">
              <div>
                <h2>No sessions yet</h2>
                <p>Add a session to start tracking pace.</p>
              </div>
              <Link
                className="button"
                href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/pace/new`}
              >
                Add session
              </Link>
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
            <PaceProgressChart data={paceProgressData} range={chartRange} />
            <section className="section-block">
              <div className="section-heading">
                <h2>Session history</h2>
              </div>
              <PaginationNav
                ariaLabel="Session pagination"
                baseHref={`/logs/${exercise.log.slug}/exercises/${exercise.slug}`}
                limit={paceSessions.pagination.limit}
                page={paceSessions.pagination.page}
                placement="top"
                totalItems={paceSessions.pagination.totalItems}
                totalPages={paceSessions.pagination.totalPages}
              />
              <div className="list evidence-list" aria-label="Sessions">
              {paceSessions.sessions.map((session) => (
                <Link
                  className="list-item session-card"
                  href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/pace/${session.id}`}
                  key={session.id}
                >
                  <div>
                    <h2>{formatPaceSessionDate(session.performedAt)}</h2>
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
                </Link>
              ))}
              </div>
            </section>
            <PaginationNav
              ariaLabel="Session pagination"
              baseHref={`/logs/${exercise.log.slug}/exercises/${exercise.slug}`}
              limit={paceSessions.pagination.limit}
              page={paceSessions.pagination.page}
              placement="bottom"
              totalItems={paceSessions.pagination.totalItems}
              totalPages={paceSessions.pagination.totalPages}
            />
          </>
        )
      ) : (
        <section className="empty-state section-block">
          <div>
            <h2>No sessions yet</h2>
            <p>Add a session to start building progress evidence.</p>
          </div>
        </section>
      )}
    </main>
  );
}
