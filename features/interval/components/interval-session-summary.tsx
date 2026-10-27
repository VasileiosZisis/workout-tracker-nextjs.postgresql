import { MetricList } from "@/components/metric-list";
import { formatDuration, formatWorkRestRatio } from "../format";

type IntervalSessionSummaryProps = {
  variant?: "standard" | "compact";
  session: {
    performedAt: Date;
    rounds: number;
    workSeconds: number;
    recoverySeconds: number;
    includeFinalRecovery: boolean;
    totalWorkSeconds: number;
    totalRecoverySeconds: number;
    intervalBlockSeconds: number;
  };
};

export function IntervalSessionSummary({
  session,
  variant,
}: IntervalSessionSummaryProps) {
  return (
    <div className="session-summary">
      <MetricList
        variant={variant}
        items={[
          {
            label: "Total work",
            value: formatDuration(session.totalWorkSeconds),
            tone: "lime",
          },
          {
            label: "Block duration",
            value: formatDuration(session.intervalBlockSeconds),
            tone: "violet",
          },
          { label: "Rounds", value: session.rounds, tone: "amber" },
          {
            label: "Work:rest ratio",
            value: formatWorkRestRatio(
              session.workSeconds,
              session.recoverySeconds,
            ),
            tone: "blue",
          },
          {
            label: "Work per round",
            value: formatDuration(session.workSeconds),
            tone: "lime",
          },
          {
            label: "Recovery per round",
            value: formatDuration(session.recoverySeconds),
            tone: "violet",
          },
          {
            label: "Total recovery",
            value: formatDuration(session.totalRecoverySeconds),
            tone: "amber",
          },
          {
            label: "Final recovery",
            value: session.includeFinalRecovery ? "Included" : "Excluded",
            tone: "blue",
          },
        ]}
      />
    </div>
  );
}
