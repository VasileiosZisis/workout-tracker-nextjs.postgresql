import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logs",
};

export default function LogsPage() {
  return (
    <main className="page">
      <section className="page-header">
        <p className="eyebrow">App foundation</p>
        <h1>Logs</h1>
        <div className="empty-state">
          <p>Log management starts in the logs milestone.</p>
        </div>
      </section>
    </main>
  );
}
