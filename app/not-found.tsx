import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <section className="state-panel">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="lede">
          This route does not point to available training evidence.
        </p>
        <div className="actions">
          <Link className="button" href="/">
            Go home
          </Link>
          <Link className="button-secondary" href="/logs">
            Open logs
          </Link>
        </div>
      </section>
    </main>
  );
}
