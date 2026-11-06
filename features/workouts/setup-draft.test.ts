import { randomUUID } from "node:crypto";
import { draftKey, moveItem, newSetupDraft, restoreSetupDraft, setupStepError } from "./setup-draft";
import { routineSetupSchema } from "./setup-schema";

describe("routine setup draft and step validation", () => {
  it("starts with one blank workout and preserves a tab draft and request ID across refresh", () => {
    const id = randomUUID(), draft = newSetupDraft(id, "Europe/Chisinau");
    expect(draft.workouts).toHaveLength(1); expect(draft.workouts[0].name).toBe("");
    draft.name = "Split"; draft.workouts[0].name = "Push"; draft.workouts[0].exerciseIds = ["exercise"];
    draft.catalog = [{ id: "exercise", title: "Bench press", slug: "bench" }]; draft.step = 3;
    const restored = restoreSetupDraft(JSON.stringify(draft));
    expect(restored).toEqual(draft); expect(restored!.requestId).toBe(id);
    expect(draftKey("user-a", "log")).not.toBe(draftKey("user-b", "log"));
    expect(draftKey("user-a", "log")).not.toBe(draftKey("user-a", "second-log"));
    expect(restoreSetupDraft(null)).toBeNull(); // Cancel/success remove this key.
  });
  it("rejects incompatible/corrupt drafts and keeps unfinished drafts separate from save validation", () => {
    const draft = newSetupDraft(randomUUID());
    expect(restoreSetupDraft(JSON.stringify(draft))).toEqual(draft);
    expect(routineSetupSchema.safeParse({ ...draft, today: "2026-11-05" }).success).toBe(false);
    expect(restoreSetupDraft("bad JSON")).toBeNull();
    expect(restoreSetupDraft(JSON.stringify({ ...draft, version: 2 }))).toBeNull();
    expect(restoreSetupDraft(JSON.stringify({ ...draft, workouts: [] }))).toBeNull();
  });
  it("validates each setup step without losing other workout selections on Back/Continue", () => {
    const draft = newSetupDraft(randomUUID());
    expect(setupStepError(draft)).toContain("Name");
    draft.name = "Split"; draft.workouts[0].name = "Push";
    expect(setupStepError(draft)).toBeNull();
    draft.step = 2;
    expect(setupStepError(draft)).toContain("at least one");
    const inline = { id: `new:${randomUUID()}`, title: "Row" };
    draft.newExercises = [inline]; draft.workouts[0].exerciseIds = [inline.id];
    draft.workouts.push({ id: "pull", name: "Pull", exerciseIds: [inline.id] });
    expect(setupStepError(draft)).toBeNull();
    draft.workouts[1].exerciseIds = ["deleted"];
    expect(setupStepError(draft)).toContain("available");
    draft.workouts[1].exerciseIds = [inline.id]; draft.step = 1;
    expect(draft.workouts[0].exerciseIds).toEqual([inline.id]);
    draft.workouts = moveItem(draft.workouts, 0, 1);
    expect(draft.workouts[0].name).toBe("Pull"); expect(draft.workouts[1].exerciseIds).toEqual([inline.id]);
  });
  it("enforces one exercise per workout while allowing reuse between workouts", () => {
    const draft = newSetupDraft(randomUUID()); draft.name = "Split"; draft.workouts[0].name = "Push"; draft.workouts[0].exerciseIds = ["same"];
    draft.workouts.push({ id: "pull", name: "Pull", exerciseIds: ["same"] });
    expect(routineSetupSchema.safeParse({ ...draft, today: "2026-11-05" }).success).toBe(true);
    draft.workouts[0].exerciseIds.push("same");
    expect(routineSetupSchema.safeParse({ ...draft, today: "2026-11-05" }).success).toBe(false);
  });
});
