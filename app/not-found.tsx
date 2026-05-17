import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <section className="page-header">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="lede">The page you requested does not exist.</p>
        <div className="actions">
          <Link className="button" href="/">
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
