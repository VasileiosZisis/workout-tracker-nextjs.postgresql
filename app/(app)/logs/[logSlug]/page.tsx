import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { PaginationNav } from "@/components/pagination-nav";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { parsePagination } from "@/features/logs/pagination";
import { getExercisesPage } from "@/features/exercises/queries";
import { sessionKindLabels } from "@/features/exercises/types";

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
  searchParams,
}: {
  params: Promise<{ logSlug: string }>;
  searchParams: Promise<{
    page?: string | string[];
    limit?: string | string[];
  }>;
}) {
  const user = await requireUser();
  const { logSlug } = await params;
  const paginationInput = parsePagination(await searchParams);
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });

  if (!log) {
    notFound();
  }

  const { exercises, pagination } = await getExercisesPage({
    userId: user.id,
    logId: log.id,
    ...paginationInput,
  });

  return (
    <main className="page">
      <BackLink href="/logs">Exercise library</BackLink>
      <section className="page-header compact-header">
        <h1>{log.title}</h1>
        <div className="actions">
          <Link className="button-secondary" href={`/logs/${log.slug}/edit`}>
            Edit log
          </Link>
          <Link className="button" href={`/logs/${log.slug}/exercises/new`}>
            Add exercise
          </Link>
        </div>
      </section>
      <PaginationNav
        ariaLabel="Exercise pagination"
        baseHref={`/logs/${log.slug}`}
        limit={pagination.limit}
        page={pagination.page}
        placement="top"
        totalItems={pagination.totalItems}
        totalPages={pagination.totalPages}
      />
      {exercises.length === 0 ? (
        <section className="empty-state section-block">
          <div>
            <h2>No exercises yet</h2>
            <p>Add one to start collecting sessions.</p>
          </div>
          <Link className="button" href={`/logs/${log.slug}/exercises/new`}>
            Add exercise
          </Link>
        </section>
      ) : (
        <section className="list section-block evidence-list" aria-label="Exercises">
          {exercises.map((exercise) => (
            <Link
              className="list-item session-card"
              href={`/logs/${log.slug}/exercises/${exercise.slug}`}
              key={exercise.id}
            >
              <div>
                <h2>{exercise.title}</h2>
                <p>
                  <span className="metric-pill">
                    {sessionKindLabels[exercise.sessionKind]}
                  </span>
                </p>
              </div>
            </Link>
          ))}
        </section>
      )}
      <PaginationNav
        ariaLabel="Exercise pagination"
        baseHref={`/logs/${log.slug}`}
        limit={pagination.limit}
        page={pagination.page}
        placement="bottom"
        totalItems={pagination.totalItems}
        totalPages={pagination.totalPages}
      />
    </main>
  );
}
