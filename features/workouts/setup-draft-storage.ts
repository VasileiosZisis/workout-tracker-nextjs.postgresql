import { newSetupDraft, restoreSetupDraft, type SetupDraft } from "./setup-draft";
import type { ExerciseOption } from "./setup-schema";

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// The wizard uses tab-local storage; storage restrictions must not prevent setup.
export async function loadSetupSession(storage: DraftStorage, key: string, requestId: string, timezone: string,
  validate: (ids: string[]) => Promise<ExerciseOption[]>) {
  let restored: SetupDraft | null = null;
  try { restored = restoreSetupDraft(storage.getItem(key)); } catch { /* Use an in-memory draft. */ }
  const draft = restored ?? newSetupDraft(requestId, timezone);
  const ids = [...new Set(draft.workouts.flatMap((item) => item.exerciseIds)
    .filter((id) => !draft.newExercises.some((item) => item.id === id)))];
  const catalog = await validate(ids);
  return { draft: { ...draft, catalog }, restored: !!restored, unavailable: catalog.length !== ids.length };
}

export function saveSetupSession(storage: DraftStorage, key: string, draft: SetupDraft) {
  try { storage.setItem(key, JSON.stringify(draft)); } catch { /* In-memory editing still works. */ }
}

export function clearSetupSession(storage: DraftStorage, key: string) {
  try { storage.removeItem(key); } catch { /* Storage can be disabled. */ }
}
