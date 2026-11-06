import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { getWorkoutSelection } from "@/features/workouts/queries";
import { WorkoutStartControls } from "@/features/workouts/components/workout-start-controls";

export const metadata = { title: "Choose workout" };
export default async function StartWorkoutPage({ params }: { params: Promise<{ logSlug: string }> }) {
  const user = await requireUser();
  const { logSlug } = await params;
  const log = await getLogBySlug({ userId: user.id, slug: logSlug });
  if (!log) notFound();
  const routine = await getWorkoutSelection(user.id, log.id);
  if (routine?.active) redirect(`/logs/${log.slug}/workouts/${routine.active.slug}`);
  return <main className="page"><BackLink href={`/logs/${log.slug}`}>{log.title}</BackLink>
    <section className="page-header compact-header"><h1>Choose workout</h1></section>
    <section className="section-block narrow form-panel workout-panel">{routine ? <WorkoutStartControls
      key={`${routine.revision}:${routine.schedule?.id}:${routine.schedule?.today}`} logId={log.id} logSlug={log.slug}
      routineId={routine.routineId} revision={routine.revision} nextId={routine.nextId} definitions={routine.definitions ?? []}
      schedule={routine.schedule ?? null} requestId={randomUUID()} /> : <Link href={`/routine/${log.slug}`}>Create a routine first</Link>}
    </section>
  </main>;
}
