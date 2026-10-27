import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionKind } from "@/generated/prisma/enums";
import { BackLink } from "@/components/back-link";
import { MetricList } from "@/components/metric-list";
import { PaginationNav } from "@/components/pagination-nav";
import { requireUser } from "@/lib/auth";
import { getExerciseBySlug } from "@/features/exercises/queries";
import { sessionKindLabels } from "@/features/exercises/types";
import {
  formatDuration as formatIntervalDuration,
  formatSessionDate as formatIntervalSessionDate,
  formatWorkRestRatio,
} from "@/features/interval/format";
import {
  getIntervalSessionsPage,
  getLatestIntervalSession,
} from "@/features/interval/queries";
import { parsePagination } from "@/features/logs/pagination";
import {
  IntervalProgressChart,
  PaceProgressChart,
  WeightliftingProgressChart,
} from "@/features/progress/components/progress-charts";
import {
  getIntervalProgressData,
  getPaceProgressData,
  getWeightliftingProgressData,
} from "@/features/progress/queries";
import { parseChartRangeSearchParams } from "@/features/progress/date-range";
import {
  formatDecimal as formatPaceDecimal,
  formatPace,
  formatSessionDate as formatPaceSessionDate,
} from "@/features/pace/format";
import {
  getLatestPaceSession,
  getPaceSessionsPage,
} from "@/features/pace/queries";
import {
  formatDecimal as formatWeightliftingDecimal,
  formatSessionDate as formatWeightliftingSessionDate,
} from "@/features/weightlifting/format";
import { calculateAverageWorkingLoad } from "@/features/weightlifting/metrics";
import {
  getLatestWeightliftingSession,
  getWeightliftingSessionsPage,
} from "@/features/weightlifting/queries";

function formatAverageWorkingLoad(
  sets: readonly {
    repetitions: { toString(): string };
    kilograms: { toString(): string };
    isHard: boolean;
  }[],
) {
  const averageWorkingLoad = calculateAverageWorkingLoad(
    sets.map((set) => ({
      repetitions: Number(set.repetitions),
      kilograms: Number(set.kilograms),
      isHard: set.isHard,
    })),
  );

  return averageWorkingLoad === null
    ? "—"
    : `${formatWeightliftingDecimal(averageWorkingLoad)} kg`;
}

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

  const weightliftingData =
    exercise.sessionKind === SessionKind.WEIGHTLIFTING
      ? await Promise.all([
          getWeightliftingSessionsPage({
            userId: user.id,
            exerciseId: exercise.id,
            page: paginationInput.page,
            limit: paginationInput.limit,
          }),
          getWeightliftingProgressData({
            chartRange,
            userId: user.id,
            exerciseId: exercise.id,
          }),
          getLatestWeightliftingSession({
            userId: user.id,
            exerciseId: exercise.id,
          }),
        ])
      : null;
  const paceData =
    exercise.sessionKind === SessionKind.PACE
      ? await Promise.all([
          getPaceSessionsPage({
            userId: user.id,
            exerciseId: exercise.id,
            page: paginationInput.page,
            limit: paginationInput.limit,
          }),
          getPaceProgressData({
            chartRange,
            userId: user.id,
            exerciseId: exercise.id,
          }),
          getLatestPaceSession({
            userId: user.id,
            exerciseId: exercise.id,
          }),
        ])
      : null;
  const intervalData =
    exercise.sessionKind === SessionKind.INTERVAL
      ? await Promise.all([
          getIntervalSessionsPage({
            userId: user.id,
            exerciseId: exercise.id,
            page: paginationInput.page,
            limit: paginationInput.limit,
          }),
          getIntervalProgressData({
            chartRange,
            userId: user.id,
            exerciseId: exercise.id,
          }),
          getLatestIntervalSession({
            userId: user.id,
            exerciseId: exercise.id,
          }),
        ])
      : null;
  const weightliftingSessions = weightliftingData?.[0] ?? null;
  const weightliftingProgressData = weightliftingData?.[1] ?? null;
  const latestWeightliftingSession = weightliftingData?.[2] ?? null;
  const paceSessions = paceData?.[0] ?? null;
  const paceProgressData = paceData?.[1] ?? null;
  const latestPaceSession = paceData?.[2] ?? null;
  const intervalSessions = intervalData?.[0] ?? null;
  const intervalProgressData = intervalData?.[1] ?? null;
  const latestIntervalSession = intervalData?.[2] ?? null;
  const preservedChartParams = {
    chartFrom: chartRange.chartFrom || undefined,
    chartRange: chartRange.chartRange,
    chartTo: chartRange.chartTo || undefined,
  };

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
          {exercise.sessionKind === SessionKind.INTERVAL ? (
            <Link
              className="button"
              href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/interval/new`}
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
            <section className="section-block" aria-label="Latest evidence">
              <MetricList
                items={[
                  {
                    label: "Working volume",
                    value: latestWeightliftingSession
                      ? formatWeightliftingDecimal(
                          latestWeightliftingSession.workingVolume,
                        )
                      : "0",
                    unit: "kg",
                    tone: "lime",
                  },
                  {
                    label: "Hard sets",
                    value:
                      latestWeightliftingSession?.sets.filter((set) => set.isHard)
                        .length ?? 0,
                    tone: "amber",
                  },
                  {
                    label: "Average working load per rep",
                    value: latestWeightliftingSession
                      ? formatAverageWorkingLoad(latestWeightliftingSession.sets)
                      : "—",
                    unit: "kg",
                    tone: "blue",
                  },
                ]}
              />
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
                preservedParams={preservedChartParams}
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
                        Hard sets {session.sets.length}
                      </span>
                      <span className="metric-pill metric-pill-blue">
                        Average working load per rep{" "}
                        {formatAverageWorkingLoad(session.sets)}
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
              preservedParams={preservedChartParams}
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
            <section className="section-block" aria-label="Latest evidence">
              <MetricList
                items={[
                  {
                    label: "Latest pace",
                    value:
                      latestPaceSession && Number(latestPaceSession.pace) !== 0
                        ? formatPace({
                            paceMinutes: latestPaceSession.paceMinutes,
                            paceSeconds: latestPaceSession.paceSeconds,
                          })
                        : "0 min/km",
                    unit: "min/km",
                    tone: "blue",
                  },
                  {
                    label: "Distance",
                    value: latestPaceSession
                      ? formatPaceDecimal(latestPaceSession.distance)
                      : "0",
                    unit: "km",
                    tone: "lime",
                  },
                  {
                    label: "Speed",
                    value: latestPaceSession
                      ? formatPaceDecimal(latestPaceSession.speed)
                      : "0",
                    unit: "km/h",
                    tone: "violet",
                  },
                ]}
              />
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
                preservedParams={preservedChartParams}
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
              preservedParams={preservedChartParams}
              totalItems={paceSessions.pagination.totalItems}
              totalPages={paceSessions.pagination.totalPages}
            />
          </>
        )
      ) : exercise.sessionKind === SessionKind.INTERVAL &&
        intervalSessions &&
        intervalProgressData ? (
        intervalSessions.sessions.length === 0 ? (
          <>
            <IntervalProgressChart
              data={intervalProgressData}
              range={chartRange}
            />
            <section className="empty-state section-block">
              <div>
                <h2>No sessions yet</h2>
                <p>Add a session to start tracking interval workload.</p>
              </div>
              <Link
                className="button"
                href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/interval/new`}
              >
                Add session
              </Link>
            </section>
          </>
        ) : (
          <>
            <section className="section-block" aria-label="Latest evidence">
              <MetricList
                items={[
                  {
                    label: "Latest total work",
                    value: latestIntervalSession
                      ? formatIntervalDuration(
                          latestIntervalSession.totalWorkSeconds,
                        )
                      : "0:00",
                    tone: "lime",
                  },
                  {
                    label: "Rounds",
                    value: latestIntervalSession?.rounds ?? 0,
                    tone: "amber",
                  },
                  {
                    label: "Work:rest ratio",
                    value: latestIntervalSession
                      ? formatWorkRestRatio(
                          latestIntervalSession.workSeconds,
                          latestIntervalSession.recoverySeconds,
                        )
                      : "—",
                    tone: "blue",
                  },
                ]}
              />
            </section>
            <IntervalProgressChart
              data={intervalProgressData}
              range={chartRange}
            />
            <section className="section-block">
              <div className="section-heading">
                <h2>Session history</h2>
              </div>
              <PaginationNav
                ariaLabel="Session pagination"
                baseHref={`/logs/${exercise.log.slug}/exercises/${exercise.slug}`}
                limit={intervalSessions.pagination.limit}
                page={intervalSessions.pagination.page}
                placement="top"
                preservedParams={preservedChartParams}
                totalItems={intervalSessions.pagination.totalItems}
                totalPages={intervalSessions.pagination.totalPages}
              />
              <div className="list evidence-list" aria-label="Sessions">
                {intervalSessions.sessions.map((session) => (
                  <Link
                    className="list-item session-card"
                    href={`/logs/${exercise.log.slug}/exercises/${exercise.slug}/interval/${session.id}`}
                    key={session.id}
                  >
                    <div>
                      <h2>
                        {formatIntervalSessionDate(session.performedAt)}
                      </h2>
                      <div className="session-metrics">
                        <span className="metric-pill metric-pill-blue">
                          {session.rounds} rounds
                        </span>
                        <span className="metric-pill metric-pill-lime">
                          Work {formatIntervalDuration(session.workSeconds)}
                        </span>
                        <span className="metric-pill metric-pill-amber">
                          Recovery{" "}
                          {formatIntervalDuration(session.recoverySeconds)}
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
              limit={intervalSessions.pagination.limit}
              page={intervalSessions.pagination.page}
              placement="bottom"
              preservedParams={preservedChartParams}
              totalItems={intervalSessions.pagination.totalItems}
              totalPages={intervalSessions.pagination.totalPages}
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
