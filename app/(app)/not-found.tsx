import Link from "next/link";

export default function AppNotFound() {
  return (
    <main className="page">
      <section className="state-panel">
        <h1>No matching record</h1>
        <p className="lede">
          The log, exercise, or session is unavailable for this account.
        </p>
        <div className="actions">
          <Link className="button" href="/logs">
            Open logs
          </Link>
        </div>
      </section>
    </main>
  );
}
