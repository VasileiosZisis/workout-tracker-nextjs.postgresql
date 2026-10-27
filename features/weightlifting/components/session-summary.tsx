import type { Prisma } from "@/generated/prisma/client";
import { MetricList } from "@/components/metric-list";
import { formatDecimal } from "../format";
import { calculateAverageWorkingLoad } from "../metrics";

type SessionSummaryProps = {
  variant?: "standard" | "compact";
  session: {
    performedAt: Date;
    totalVolume: Prisma.Decimal;
    junkVolume: Prisma.Decimal;
    workingVolume: Prisma.Decimal;
    sets: {
      id: string;
      position: number;
      repetitions: Prisma.Decimal;
      kilograms: Prisma.Decimal;
      isHard: boolean;
      volume: Prisma.Decimal;
    }[];
  };
};

export function SessionSummary({ session, variant }: SessionSummaryProps) {
  const averageWorkingLoad = calculateAverageWorkingLoad(
    session.sets.map((set) => ({
      repetitions: Number(set.repetitions),
      kilograms: Number(set.kilograms),
      isHard: set.isHard,
    })),
  );

  return (
    <div className="session-summary">
      <MetricList
        variant={variant}
        items={[
          {
            label: "Working volume",
            value: formatDecimal(session.workingVolume),
            unit: "kg",
            tone: "lime",
          },
          {
            label: "Total volume",
            value: formatDecimal(session.totalVolume),
            unit: "kg",
            tone: "violet",
          },
          {
            label: "Average working load per rep",
            value:
              averageWorkingLoad === null
                ? "—"
                : formatDecimal(averageWorkingLoad),
            unit: "kg",
            tone: "blue",
          },
          {
            label: "Junk volume",
            value: formatDecimal(session.junkVolume),
            unit: "kg",
            tone: "amber",
          },
        ]}
      />
      <div
        className="session-sets-scroll"
        role="region"
        aria-label="Session sets"
        tabIndex={0}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Set</th>
              <th>Reps</th>
              <th>kg</th>
              <th>Type</th>
              <th>Volume</th>
              <th>Average working load per rep</th>
            </tr>
          </thead>
          <tbody>
            {session.sets.map((set) => (
              <tr key={set.id}>
                <td>{set.position}</td>
                <td>{formatDecimal(set.repetitions)}</td>
                <td>{formatDecimal(set.kilograms)}</td>
                <td>{set.isHard ? "Hard" : "Junk"}</td>
                <td>{formatDecimal(set.volume)} kg</td>
                <td>{set.isHard ? `${formatDecimal(set.kilograms)} kg` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
