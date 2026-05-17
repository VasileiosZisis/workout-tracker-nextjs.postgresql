export default function ExerciseLoading() {
  return (
    <main className="page">
      <section className="state-panel compact-state" aria-live="polite" aria-busy="true">
        <p className="eyebrow">Exercise</p>
        <h1>Loading evidence</h1>
        <p className="lede">Preparing metrics, charts, and session history.</p>
        <div className="skeleton-stack" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
