import type { Prisma } from "@/generated/prisma/client";
import {
  formatDecimal,
  formatDuration,
  formatPace,
  formatSessionDate,
} from "../format";

type PaceSessionSummaryProps = {
  session: {
    performedAt: Date;
    hours: number;
    minutes: number;
    seconds: number;
    distance: Prisma.Decimal;
    pace: Prisma.Decimal;
    paceMinutes: number;
    paceSeconds: number;
    speed: Prisma.Decimal;
  };
};

export function PaceSessionSummary({ session }: PaceSessionSummaryProps) {
  return (
    <div className="session-summary">
      <dl className="metric-grid">
        <div className="metric-card metric-card-blue">
          <dt>Date</dt>
          <dd>{formatSessionDate(session.performedAt)}</dd>
        </div>
        <div className="metric-card metric-card-violet">
          <dt>Time</dt>
          <dd>{formatDuration(session)}</dd>
        </div>
        <div className="metric-card metric-card-lime">
          <dt>Distance</dt>
          <dd>{formatDecimal(session.distance)} km</dd>
        </div>
        <div className="metric-card metric-card-blue">
          <dt>Pace</dt>
          <dd>
            {Number(session.pace) === 0
              ? "0 min/km"
              : formatPace({
                  paceMinutes: session.paceMinutes,
                  paceSeconds: session.paceSeconds,
              })}
          </dd>
        </div>
        <div className="metric-card metric-card-violet">
          <dt>Speed</dt>
          <dd>{formatDecimal(session.speed)} km/h</dd>
        </div>
      </dl>
    </div>
  );
}
