import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ logSlug: string }>;
}): Promise<Metadata> {
  const user = await requireUser();
  const { logSlug } = await params;
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });

  return {
    title: log?.title ?? "Log",
  };
}

export default async function LogDetailPage({
  params,
}: {
  params: Promise<{ logSlug: string }>;
}) {
  const user = await requireUser();
  const { logSlug } = await params;
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });

  if (!log) {
    notFound();
  }

  return (
    <main className="page">
      <Link className="text-link" href="/logs">
        Logs
      </Link>
      <section className="page-header compact-header">
        <p className="eyebrow">Log</p>
        <h1>{log.title}</h1>
        <p className="lede">Exercises will be added in the next milestone.</p>
        <div className="actions">
          <Link className="button-secondary" href={`/logs/${log.slug}/edit`}>
            Edit log
          </Link>
        </div>
      </section>
      <section className="empty-state section-block">
        <p>No exercises yet.</p>
      </section>
    </main>
  );
}
