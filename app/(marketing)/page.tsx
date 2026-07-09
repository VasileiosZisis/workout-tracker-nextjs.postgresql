import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <section className="page-header">
        <h1>Workout Trackr</h1>
        <div className="actions">
          <Link className="button" href="/login">
            Sign in
          </Link>
          <Link className="button-secondary" href="/logs">
            View logs
          </Link>
        </div>
      </section>

      <section className="section-grid" aria-label="Tracking areas">
        <div className="panel">
          <h2>Logs</h2>
          <p>Group work by plans, goals, or training phases.</p>
        </div>
        <div className="panel">
          <h2>Exercises</h2>
          <p>Track weightlifting and pace-based activities.</p>
        </div>
        <div className="panel">
          <h2>Evidence</h2>
          <p>Review volume, pace, speed, and progress over time.</p>
        </div>
      </section>
    </main>
  );
}
