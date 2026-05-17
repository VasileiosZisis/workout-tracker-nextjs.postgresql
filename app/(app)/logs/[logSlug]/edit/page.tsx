import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { updateLogAction } from "@/features/logs/actions";
import { DeleteLogForm } from "@/features/logs/components/delete-log-form";
import { LogForm } from "@/features/logs/components/log-form";
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
    title: log ? `Edit ${log.title}` : "Edit Log",
  };
}

export default async function EditLogPage({
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
      <Link className="text-link" href={`/logs/${log.slug}`}>
        {log.title}
      </Link>
      <section className="page-header compact-header">
        <p className="eyebrow">Edit log</p>
        <h1>Edit {log.title}</h1>
      </section>
      <section className="section-block narrow">
        <LogForm
          action={updateLogAction}
          defaultTitle={log.title}
          logId={log.id}
          submitLabel="Save log"
        />
        <div className="form-footer">
          <Link className="button-secondary" href={`/logs/${log.slug}`}>
            Cancel
          </Link>
        </div>
      </section>
      <section className="section-block narrow danger-zone">
        <h2>Delete log</h2>
        <p>Deleting a log cannot be undone.</p>
        <DeleteLogForm logId={log.id} />
      </section>
    </main>
  );
}
