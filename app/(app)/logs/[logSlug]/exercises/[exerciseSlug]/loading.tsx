export default function ExerciseLoading() {
  return (
    <main className="page loading-page" aria-busy="true" aria-live="polite">
      <section className="loading-shell" aria-label="Loading exercise">
        <span className="loading-status">Loading exercise</span>
        <div className="loading-back" aria-hidden="true" />
        <div className="loading-header loading-header-with-actions" aria-hidden="true">
          <span className="loading-line loading-line-title" />
          <span className="loading-line loading-line-action" />
          <span className="loading-line loading-line-action loading-line-action-primary" />
        </div>
        <div className="loading-metrics" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="loading-chart" aria-hidden="true">
          <span className="loading-line loading-line-section" />
          <span className="loading-chart-frame" />
        </div>
        <div className="loading-list" aria-hidden="true">
          <span className="loading-line loading-line-section" />
          <span className="loading-row" />
          <span className="loading-row" />
        </div>
      </section>
    </main>
  );
}
