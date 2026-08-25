import {
  formatDuration,
  formatSessionDate,
  formatWorkRestRatio,
} from "../format";

type IntervalSessionSummaryProps = {
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
}: IntervalSessionSummaryProps) {
  return (
    <div className="session-summary">
      <dl className="metric-grid">
        <div className="metric-card metric-card-blue">
          <dt>Date</dt>
          <dd>{formatSessionDate(session.performedAt)}</dd>
        </div>
        <div className="metric-card metric-card-amber">
          <dt>Rounds</dt>
          <dd>{session.rounds}</dd>
        </div>
        <div className="metric-card metric-card-lime">
          <dt>Work per round</dt>
          <dd>{formatDuration(session.workSeconds)}</dd>
        </div>
        <div className="metric-card metric-card-violet">
          <dt>Recovery per round</dt>
          <dd>{formatDuration(session.recoverySeconds)}</dd>
        </div>
        <div className="metric-card metric-card-blue">
          <dt>Final recovery</dt>
          <dd>{session.includeFinalRecovery ? "Included" : "Excluded"}</dd>
        </div>
        <div className="metric-card metric-card-lime">
          <dt>Total work</dt>
          <dd>{formatDuration(session.totalWorkSeconds)}</dd>
        </div>
        <div className="metric-card metric-card-amber">
          <dt>Total recovery</dt>
          <dd>{formatDuration(session.totalRecoverySeconds)}</dd>
        </div>
        <div className="metric-card metric-card-violet">
          <dt>Block duration</dt>
          <dd>{formatDuration(session.intervalBlockSeconds)}</dd>
        </div>
        <div className="metric-card metric-card-blue">
          <dt>Work:rest ratio</dt>
          <dd>
            {formatWorkRestRatio(
              session.workSeconds,
              session.recoverySeconds,
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
