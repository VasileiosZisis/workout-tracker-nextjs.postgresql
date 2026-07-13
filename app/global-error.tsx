"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="page">
          <section className="state-panel">
            <h1>Workout Trackr is unavailable</h1>
            <p className="lede">
              The application could not finish loading. Please try again.
            </p>
            <div className="actions">
              <button className="button" type="button" onClick={reset}>
                Try again
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
