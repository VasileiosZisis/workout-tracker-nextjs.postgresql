import type { Prisma } from "@/generated/prisma/client";
import { formatDecimal, formatSessionDate } from "../format";
import { calculateAverageWorkingLoad } from "../metrics";

type SessionSummaryProps = {
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

export function SessionSummary({ session }: SessionSummaryProps) {
  const averageWorkingLoad = calculateAverageWorkingLoad(
    session.sets.map((set) => ({
      repetitions: Number(set.repetitions),
      kilograms: Number(set.kilograms),
      isHard: set.isHard,
    })),
  );

  return (
    <div className="session-summary">
      <dl className="metric-grid">
        <div className="metric-card metric-card-blue">
          <dt>Date</dt>
          <dd>{formatSessionDate(session.performedAt)}</dd>
        </div>
        <div className="metric-card metric-card-violet">
          <dt>Total volume</dt>
          <dd>{formatDecimal(session.totalVolume)} kg</dd>
        </div>
        <div className="metric-card metric-card-lime">
          <dt>Working volume</dt>
          <dd>{formatDecimal(session.workingVolume)} kg</dd>
        </div>
        <div className="metric-card metric-card-blue">
          <dt>Average working load per rep</dt>
          <dd>
            {averageWorkingLoad === null
              ? "—"
              : `${formatDecimal(averageWorkingLoad)} kg`}
          </dd>
        </div>
        <div className="metric-card metric-card-amber">
          <dt>Junk volume</dt>
          <dd>{formatDecimal(session.junkVolume)} kg</dd>
        </div>
      </dl>
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
  );
}
