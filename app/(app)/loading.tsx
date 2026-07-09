export default function AppLoading() {
  return (
    <main className="page">
      <section className="state-panel compact-state" aria-live="polite" aria-busy="true">
        <h1>Reading training data</h1>
        <p className="lede">Preparing the current workspace.</p>
        <div className="skeleton-stack" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
