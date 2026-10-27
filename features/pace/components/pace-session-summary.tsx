import type { Prisma } from "@/generated/prisma/client";
import { MetricList } from "@/components/metric-list";
import { formatDecimal, formatDuration, formatPace } from "../format";

type PaceSessionSummaryProps = {
  variant?: "standard" | "compact";
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

export function PaceSessionSummary({ session, variant }: PaceSessionSummaryProps) {
  return (
    <div className="session-summary">
      <MetricList
        variant={variant}
        items={[
          {
            label: "Pace",
            value:
              Number(session.pace) === 0
                ? "0 min/km"
                : formatPace({
                    paceMinutes: session.paceMinutes,
                    paceSeconds: session.paceSeconds,
                  }),
            unit: "min/km",
            tone: "blue",
          },
          { label: "Time", value: formatDuration(session), tone: "amber" },
          {
            label: "Distance",
            value: formatDecimal(session.distance),
            unit: "km",
            tone: "lime",
          },
          {
            label: "Speed",
            value: formatDecimal(session.speed),
            unit: "km/h",
            tone: "violet",
          },
        ]}
      />
    </div>
  );
}
