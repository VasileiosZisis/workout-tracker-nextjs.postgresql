export function MarketingLoading({
  showHeader = false,
}: Readonly<{
  showHeader?: boolean;
}>) {
  return (
    <>
      {showHeader ? (
        <header className="training-loading-header" aria-hidden="true">
          <span>Workout Trackr</span>
          <small>Performance Lab</small>
        </header>
      ) : null}

      <main className="training-loading" aria-busy="true" aria-live="polite">
        <span className="loading-status">Loading training evidence</span>
        <section className="training-loading-inner" aria-label="Loading homepage">
          <span className="training-loading-mark" aria-hidden="true">
            Workout Trackr
          </span>
          <p className="training-loading-kicker">Performance Lab</p>
          <h1>Loading training evidence</h1>
          <div
            className="training-loading-track"
            role="progressbar"
            aria-label="Loading training evidence"
          >
            <span />
          </div>
          <div className="training-loading-signals" aria-hidden="true">
            <span>Volume</span>
            <span>Pace</span>
            <span>Progress</span>
          </div>
        </section>
      </main>
    </>
  );
}
