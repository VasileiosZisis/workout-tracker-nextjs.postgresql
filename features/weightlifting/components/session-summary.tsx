import type { Prisma } from "@/generated/prisma/client";
import { formatDecimal, formatSessionDate } from "../format";

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
  return (
    <div className="session-summary">
      <dl className="metric-grid">
        <div>
          <dt>Date</dt>
          <dd>{formatSessionDate(session.performedAt)}</dd>
        </div>
        <div>
          <dt>Total volume</dt>
          <dd>{formatDecimal(session.totalVolume)} kg</dd>
        </div>
        <div>
          <dt>Working volume</dt>
          <dd>{formatDecimal(session.workingVolume)} kg</dd>
        </div>
        <div>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
