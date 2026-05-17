import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <section className="page-header">
        <p className="eyebrow">Next.js rewrite</p>
        <h1>Log your training. Track your progress.</h1>
        <p className="lede">
          A modern rebuild of Workout Tracker using Next.js, Neon Postgres,
          Prisma, Auth.js, and Zod.
        </p>
        <div className="actions">
          <Link className="button" href="/login">
            Continue
          </Link>
          <Link className="button-secondary" href="/logs">
            View logs
          </Link>
        </div>
      </section>

      <section className="section-grid" aria-label="Planned tracking areas">
        <div className="panel">
          <h2>Logs</h2>
          <p>Create training logs for plans, goals, or phases.</p>
        </div>
        <div className="panel">
          <h2>Exercises</h2>
          <p>Define custom weightlifting and pace exercises.</p>
        </div>
        <div className="panel">
          <h2>Sessions</h2>
          <p>Track volume, pace, speed, and progress over time.</p>
        </div>
      </section>
    </main>
  );
}
