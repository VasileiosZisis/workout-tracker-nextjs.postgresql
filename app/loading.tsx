export default function Loading() {
  return (
    <main className="page loading-page" aria-busy="true" aria-live="polite">
      <section className="loading-shell" aria-label="Loading page">
        <span className="loading-status">Loading page</span>
        <div className="loading-header" aria-hidden="true">
          <span className="loading-line loading-line-title" />
          <span className="loading-line loading-line-action" />
        </div>
        <div className="loading-list" aria-hidden="true">
          <span className="loading-row" />
          <span className="loading-row" />
          <span className="loading-row" />
        </div>
      </section>
    </main>
  );
}
