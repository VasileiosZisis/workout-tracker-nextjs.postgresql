import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { draftKey } from "./setup-draft";
import { clearSetupSession, loadSetupSession, saveSetupSession } from "./setup-draft-storage";

function tabStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}

describe("wizard tab-storage lifecycle", () => {
  it("restores navigation, assignments and the original request after refresh, revalidating cached references", async () => {
    const storage = tabStorage(), key = draftKey("owner", "log"), requestId = randomUUID();
    const initial = await loadSetupSession(storage, key, requestId, "Europe/Chisinau", async () => []);
    expect(initial.restored).toBe(false);
    const draft = initial.draft;
    draft.name = "My split"; draft.workouts[0].name = "Push"; draft.step = 2;
    const inline = { id: `new:${randomUUID()}`, title: "Inline row" };
    draft.newExercises = [inline]; draft.workouts[0].exerciseIds = ["owned", inline.id, "deleted"];
    draft.workouts.push({ id: "pull", name: "Pull", exerciseIds: [inline.id, "owned"] });
    draft.catalog = [{ id: "owned", title: "Old title", slug: "old" }, { id: "deleted", title: "Deleted", slug: "deleted" }];
    saveSetupSession(storage, key, draft);
    draft.step = 3; saveSetupSession(storage, key, draft);
    const validate = vi.fn(async () => [{ id: "owned", title: "Renamed row", slug: "renamed" }]);
    const refreshed = await loadSetupSession(storage, key, randomUUID(), "UTC", validate);
    expect(validate).toHaveBeenCalledWith(["owned", "deleted"]);
    expect(refreshed.restored).toBe(true); expect(refreshed.unavailable).toBe(true);
    expect(refreshed.draft).toMatchObject({ requestId, step: 3, timezone: "Europe/Chisinau", workouts: draft.workouts, newExercises: [inline] });
    expect(refreshed.draft.catalog).toEqual([{ id: "owned", title: "Renamed row", slug: "renamed" }]);
    expect((await loadSetupSession(tabStorage(), key, randomUUID(), "UTC", async () => [])).restored).toBe(false);
    expect((await loadSetupSession(storage, draftKey("another-owner", "log"), randomUUID(), "UTC", async () => [])).restored).toBe(false);
  });

  it("keeps drafts through failed validation and retries, then clears on Cancel or successful creation", async () => {
    const storage = tabStorage(), key = draftKey("owner", "log"), requestId = randomUUID();
    const { draft } = await loadSetupSession(storage, key, requestId, "UTC", async () => []);
    draft.name = "Unfinished split"; saveSetupSession(storage, key, draft);
    await expect(loadSetupSession(storage, key, randomUUID(), "UTC", async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    expect(storage.getItem(key)).not.toBeNull();
    expect((await loadSetupSession(storage, key, randomUUID(), "UTC", async () => [])).draft.requestId).toBe(requestId);
    // Both Cancel and successful Create invoke the same removal operation.
    clearSetupSession(storage, key); expect(storage.getItem(key)).toBeNull();
    const next = await loadSetupSession(storage, key, randomUUID(), "UTC", async () => []);
    expect(next.restored).toBe(false); expect(next.draft.name).toBe("");
    saveSetupSession(storage, key, next.draft); clearSetupSession(storage, key);
    expect(storage.getItem(key)).toBeNull();
  });

  it("allows in-memory setup when browser storage is blocked", async () => {
    const denied = () => { throw new Error("Storage disabled"); };
    const storage = { getItem: denied, setItem: denied, removeItem: denied };
    const { draft } = await loadSetupSession(storage, "key", randomUUID(), "UTC", async () => []);
    expect(draft.workouts).toHaveLength(1);
    expect(() => saveSetupSession(storage, "key", draft)).not.toThrow();
    expect(() => clearSetupSession(storage, "key")).not.toThrow();
  });
});
