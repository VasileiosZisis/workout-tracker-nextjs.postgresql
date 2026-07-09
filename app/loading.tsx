export default function Loading() {
  return (
    <main className="page">
      <section className="state-panel" aria-live="polite" aria-busy="true">
        <h1>Preparing the workspace</h1>
        <p className="lede">Fetching the latest training evidence.</p>
        <div className="skeleton-stack" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
