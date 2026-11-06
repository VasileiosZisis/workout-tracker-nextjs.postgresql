import type { Prisma } from "@/generated/prisma/client";
import { createUniqueSlug } from "@/features/logs/slug";

// Call while holding the log lock, so starts and historical grouping share one namespace.
export async function allocateWorkoutSlug(tx: Prisma.TransactionClient, logId: string, name: string, date: string) {
  const nameSlug = name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  const base = `${nameSlug || "workout"}-${date}`;
  const entries = await tx.workoutEntry.findMany({
    where: { logId, OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }] },
    select: { slug: true },
  });
  return createUniqueSlug(base, entries.map((entry) => entry.slug));
}
