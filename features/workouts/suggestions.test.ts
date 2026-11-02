import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createWeightliftingSessionAction, updateWeightliftingSessionAction, deleteWeightliftingSessionAction } from "@/features/weightlifting/actions";
import { deleteExerciseAction, updateExerciseAction } from "@/features/exercises/actions";
import { changeWorkoutSuggestions, rememberWorkoutExercise, suggestionChangeSchema } from "./suggestions";
import { deleteRoutine, endEntry, lockWorkoutContext, saveRoutine, startEntry } from "./service";
import { getWorkoutPanel, getWorkoutSelection } from "./queries";
import { workoutAction } from "./actions";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); }),
}));
vi.mock("@/features/workouts/suggestions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./suggestions")>();
  return { ...actual, rememberWorkoutExercise: vi.fn(actual.rememberWorkoutExercise) };
});
vi.setConfig({ testTimeout: 45_000, hookTimeout: 30_000 });

const prefix = `suggestions-${randomUUID()}`;
const userId = `${prefix}-user`;
const logId = `${prefix}-log`;
const exerciseId = `${prefix}-exercise`;
const secondExerciseId = `${prefix}-second`;
const thirdExerciseId = `${prefix}-third`;
const date = "2026-11-01";
async function panel() { return (await getWorkoutPanel(userId, logId))!; }
async function suggestions() { return (await panel()).definitions[0].exercises; }

async function form(exercise = exerciseId, standalone = false) {
  const current = (await getWorkoutSelection(userId, logId))!;
  const data = new FormData();
  data.set("exerciseId", exercise); data.set("requestId", randomUUID()); data.set("performedDate", date);
  data.set("setCount", "1"); data.set("sets.0.repetitions", "10"); data.set("sets.0.kilograms", "50"); data.set("sets.0.isHard", "on");
  data.set("workoutSelection", standalone ? "standalone" : current.active?.id ?? "start");
  data.set("routineId", current.routineId); data.set("routineRevision", String(current.revision)); data.set("nextDefinitionId", current.nextId);
  return data;
}
async function create(data: FormData) {
  await expect(createWeightliftingSessionAction({}, data)).rejects.toThrow("NEXT_REDIRECT");
  return prisma.weightliftingSession.findUniqueOrThrow({ where: { userId_requestId: { userId, requestId: String(data.get("requestId")) } } });
}
async function removeFirst() {
  const current = await panel();
  await changeWorkoutSuggestions(userId, logId, {
    routineId: current.id, revision: current.revision, definitionId: current.definitions[0].id,
    change: { operation: "removeExercise", suggestionId: current.definitions[0].exercises[0].id },
  });
}

describe("remembered workout exercises", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: userId, role: "USER", isDemo: false, demoExpiresAt: null });
    await prisma.user.create({ data: { id: userId } });
    await prisma.log.create({ data: { id: logId, userId, title: "Strength", slug: "strength" } });
    await prisma.exercise.createMany({ data: [exerciseId, secondExerciseId, thirdExerciseId].map((id, i) => ({ id, userId, logId, title: `Exercise ${i + 1}`, slug: `exercise-${i + 1}`, sessionKind: "WEIGHTLIFTING" as const })) });
    await saveRoutine(userId, logId, { name: "Split", revision: 0, workouts: [{ id: "new:A", name: "A" }], nextId: "new:A" });
  });
  afterEach(async () => { await prisma.user.deleteMany({ where: { id: userId } }); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("does not backfill old linked sessions or learn from standalone sessions", async () => {
    await create(await form(exerciseId, true));
    const current = await panel();
    const entry = await prisma.$transaction(async (tx) => startEntry(tx, userId, logId, await lockWorkoutContext(tx, userId, logId), {
      routineId: current.id, revision: current.revision, nextId: current.nextId, date, requestId: randomUUID(),
    }));
    await prisma.weightliftingSession.create({ data: { userId, logId, exerciseId, workoutEntryId: entry.id, performedAt: new Date(`${date}T00:00:00.000Z`) } });
    expect(await suggestions()).toHaveLength(0);
    await create(await form());
    expect((await suggestions()).map((item) => item.exercise.id)).toEqual([exerciseId]);
  });

  it("deduplicates identical retries and concurrent sessions, preserving distinct sets", async () => {
    const data = await form();
    const [first, retry] = await Promise.all([create(data), create(data)]);
    expect(first.id).toBe(retry.id);
    expect(await suggestions()).toHaveLength(1);
    const [second, third] = await Promise.all([form(), form(secondExerciseId)]);
    await Promise.all([create(second), create(third)]);
    expect(await suggestions()).toHaveLength(2);
    expect(await prisma.weightliftingSession.count({ where: { logId } })).toBe(3);
    expect(await prisma.weightliftingSet.count({ where: { session: { logId } } })).toBe(3);
    const positions = await prisma.workoutExercise.findMany({ where: { definition: { routine: { logId } } }, orderBy: { position: "asc" } });
    expect(positions.map((item) => item.position)).toEqual([0, 1]);
  });

  it("keeps suggestions after discard, omission, detachment, and session deletion", async () => {
    const first = await create(await form());
    await endEntry(userId, logId, first.workoutEntryId!, true);
    expect(await suggestions()).toHaveLength(1);
    const second = await create(await form(secondExerciseId));
    await endEntry(userId, logId, second.workoutEntryId!, false);
    expect((await suggestions()).map((item) => item.exercise.id)).toEqual([exerciseId, secondExerciseId]);
    const edit = await form(secondExerciseId, true); edit.set("sessionId", second.id);
    await expect(updateWeightliftingSessionAction({}, edit)).rejects.toThrow("NEXT_REDIRECT");
    const deletion = new FormData(); deletion.set("sessionId", second.id);
    await expect(deleteWeightliftingSessionAction(deletion)).rejects.toThrow("NEXT_REDIRECT");
    expect(await suggestions()).toHaveLength(2);
  });

  it("does not undo explicit removal on retry or edit; a new save restores it", async () => {
    const data = await form();
    const session = await create(data);
    await endEntry(userId, logId, session.workoutEntryId!, false);
    await removeFirst();
    await create(data);
    const edit = await form(); edit.set("sessionId", session.id); edit.set("workoutSelection", session.workoutEntryId!); edit.set("sets.0.kilograms", "60");
    await expect(updateWeightliftingSessionAction({}, edit)).rejects.toThrow("NEXT_REDIRECT");
    expect(await suggestions()).toHaveLength(0);
    await create(await form());
    expect((await suggestions()).map((item) => item.exercise.id)).toEqual([exerciseId]);
    expect(Number((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: session.id } })).workingVolume)).toBe(600);
  });

  it("reorders through the action, rejects malformed permutations/stale forms, and preserves training", async () => {
    const first = await create(await form());
    const second = await create(await form(secondExerciseId));
    const active = await panel();
    await expect(removeFirst()).rejects.toThrow("active workout");
    await endEntry(userId, logId, first.workoutEntryId!, false);
    const current = await panel();
    const definition = current.definitions[0];
    const base = { routineId: current.id, revision: current.revision, definitionId: definition.id };
    for (const order of [[], [definition.exercises[0].id, definition.exercises[0].id], [definition.exercises[0].id, "foreign"]]) {
      await expect(changeWorkoutSuggestions(userId, logId, { ...base, change: { operation: "reorderExercises", order } })).rejects.toThrow("list changed");
    }
    const data = new FormData(); data.set("logId", logId); data.set("operation", "reorderExercises"); data.set("routineId", current.id); data.set("revision", String(current.revision)); data.set("definitionId", definition.id);
    data.set("order", JSON.stringify(definition.exercises.map((item) => item.id).reverse()));
    expect((await workoutAction({}, data)).success).toBeDefined();
    expect((await suggestions()).map((item) => item.exercise.id)).toEqual([secondExerciseId, exerciseId]);
    await expect(changeWorkoutSuggestions(userId, logId, { ...base, change: { operation: "removeExercise", suggestionId: definition.exercises[0].id } })).rejects.toThrow("changed");
    await removeFirst();
    expect((await suggestions()).map((item) => item.exercise.id)).toEqual([exerciseId]);
    const kept = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: second.id }, include: { sets: true } });
    expect(Number(kept.workingVolume)).toBe(500);
    expect(Number(kept.sets[0].volume)).toBe(500);
    expect(kept.workoutEntryId).toBe(first.workoutEntryId);
    expect((await panel()).nextId).toBe(active.nextId);
  });

  it("isolates users, logs, archived definitions, and suggestion IDs", async () => {
    const first = await create(await form());
    await endEntry(userId, logId, first.workoutEntryId!, false);
    const current = await panel();
    const input = { routineId: current.id, revision: current.revision, definitionId: current.definitions[0].id, change: { operation: "removeExercise", suggestionId: current.definitions[0].exercises[0].id } };
    await expect(changeWorkoutSuggestions("foreign-user", logId, input)).rejects.toThrow("Log not found");
    await expect(changeWorkoutSuggestions(userId, logId, { ...input, routineId: "foreign" })).rejects.toThrow("changed");
    await expect(changeWorkoutSuggestions(userId, logId, { ...input, definitionId: "foreign" })).rejects.toThrow("Workout not found");
    await expect(changeWorkoutSuggestions(userId, logId, { ...input, change: { operation: "removeExercise", suggestionId: "foreign" } })).rejects.toThrow("Suggestion not found");
    await prisma.log.create({ data: { id: `${prefix}-other-log`, userId, title: "Other", slug: "other" } });
    await saveRoutine(userId, `${prefix}-other-log`, { name: "Other", revision: 0, workouts: [{ id: "new:B", name: "B" }], nextId: "new:B" });
    await expect(changeWorkoutSuggestions(userId, `${prefix}-other-log`, input)).rejects.toThrow("changed");
    await saveRoutine(userId, logId, { name: "Split", revision: current.revision, workouts: [{ id: "new:B", name: "B" }], nextId: "new:B" });
    await expect(changeWorkoutSuggestions(userId, logId, { ...input, revision: (await panel()).revision })).rejects.toThrow("Workout not found");
  });

  it("follows exercise renames and cleans up exercise/routine deletion without deleting surviving sets", async () => {
    const first = await create(await form());
    const second = await create(await form(secondExerciseId));
    await endEntry(userId, logId, first.workoutEntryId!, false);
    const rename = new FormData(); rename.set("exerciseId", exerciseId); rename.set("title", "Renamed Exercise"); rename.set("sessionKind", "WEIGHTLIFTING");
    await expect(updateExerciseAction({}, rename)).rejects.toThrow("NEXT_REDIRECT");
    expect((await suggestions())[0].exercise.title).toBe("Renamed Exercise");
    const deletion = new FormData(); deletion.set("exerciseId", exerciseId);
    await expect(deleteExerciseAction(deletion)).rejects.toThrow("NEXT_REDIRECT");
    expect((await suggestions()).map((item) => item.exercise.id)).toEqual([secondExerciseId]);
    const current = await panel();
    await deleteRoutine(userId, logId, current.id, current.revision);
    expect(await prisma.workoutExercise.count({ where: { exerciseId: secondExerciseId } })).toBe(0);
    const remaining = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: second.id }, include: { sets: true } });
    expect(remaining.workoutEntryId).toBeNull();
    expect(Number(remaining.workingVolume)).toBe(500);
    expect(remaining.sets).toHaveLength(1);
  });

  it("removes suggestions when an exercise without remaining sessions changes kind", async () => {
    const session = await create(await form());
    await endEntry(userId, logId, session.workoutEntryId!, false);
    const deletion = new FormData(); deletion.set("sessionId", session.id);
    await expect(deleteWeightliftingSessionAction(deletion)).rejects.toThrow("NEXT_REDIRECT");
    const current = await panel();
    const edit = new FormData(); edit.set("exerciseId", exerciseId); edit.set("title", "Exercise 1"); edit.set("sessionKind", "PACE");
    await expect(updateExerciseAction({}, edit)).rejects.toThrow("NEXT_REDIRECT");
    expect(await suggestions()).toHaveLength(0);
    expect((await panel()).revision).toBeGreaterThan(current.revision);
  });

  it("keeps the same exercise independently in two workout definitions", async () => {
    const current = await panel();
    await saveRoutine(userId, logId, { name: "Split", revision: current.revision, workouts: [{ id: current.nextId, name: "A" }, { id: "new:B", name: "B" }], nextId: current.nextId });
    const first = await create(await form());
    await endEntry(userId, logId, first.workoutEntryId!, false);
    const second = await create(await form());
    expect(second.workoutEntryId).not.toBe(first.workoutEntryId);
    const after = await panel();
    expect(after.definitions.map((definition) => definition.exercises.map((item) => item.exercise.id))).toEqual([[exerciseId], [exerciseId]]);
    const positions = await prisma.workoutExercise.findMany({ where: { exerciseId }, select: { position: true } });
    expect(positions.map((item) => item.position)).toEqual([0, 0]);
  });

  it("rolls back sessions, sets, suggestions, and a newly started entry on a late save failure", async () => {
    const before = await panel();
    const actual = await vi.importActual<typeof import("./suggestions")>("@/features/workouts/suggestions");
    vi.mocked(rememberWorkoutExercise).mockImplementationOnce(async (...args) => {
      await actual.rememberWorkoutExercise(...args);
      throw new Error("SIMULATED_LATE_SAVE_FAILURE");
    });
    await expect(createWeightliftingSessionAction({}, await form())).rejects.toThrow("SIMULATED_LATE_SAVE_FAILURE");
    expect(await prisma.weightliftingSession.count({ where: { logId } })).toBe(0);
    expect(await prisma.weightliftingSet.count({ where: { session: { logId } } })).toBe(0);
    expect(await prisma.workoutExercise.count({ where: { definition: { routine: { logId } } } })).toBe(0);
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(0);
    expect((await panel()).revision).toBe(before.revision);
  });

  it("keeps linked training and suggestions when a session-kind change is rejected", async () => {
    const session = await create(await form());
    const edit = new FormData(); edit.set("exerciseId", exerciseId); edit.set("title", "Exercise 1"); edit.set("sessionKind", "PACE");
    expect((await updateExerciseAction({}, edit)).fieldErrors?.sessionKind).toBeDefined();
    expect(await suggestions()).toHaveLength(1);
    expect((await prisma.exercise.findUniqueOrThrow({ where: { id: exerciseId } })).sessionKind).toBe("WEIGHTLIFTING");
    expect(Number((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: session.id } })).workingVolume)).toBe(500);
  });

  it("serializes a kind change against a simultaneous standalone save", async () => {
    const data = await form(exerciseId, true);
    const edit = new FormData(); edit.set("exerciseId", exerciseId); edit.set("title", "Exercise 1"); edit.set("sessionKind", "PACE");
    const [save, change] = await Promise.allSettled([createWeightliftingSessionAction({}, data), updateExerciseAction({}, edit)]);
    const sessions = await prisma.weightliftingSession.count({ where: { exerciseId } });
    const current = await prisma.exercise.findUniqueOrThrow({ where: { id: exerciseId } });
    if (sessions) {
      expect(current.sessionKind).toBe("WEIGHTLIFTING");
      expect(save.status).toBe("rejected");
      if (save.status === "rejected") expect((save.reason as Error).message).toContain("NEXT_REDIRECT");
      expect(change.status).toBe("fulfilled");
      if (change.status === "fulfilled") expect(change.value.fieldErrors?.sessionKind?.[0] ?? change.value.formError).toContain("Session type cannot be changed");
    } else {
      expect(current.sessionKind).toBe("PACE");
      expect(change.status).toBe("rejected");
      if (change.status === "rejected") expect((change.reason as Error).message).toContain("NEXT_REDIRECT");
      if (save.status === "rejected") expect((save.reason as Error).message).toContain("NEXT_NOT_FOUND");
      else expect(save.value.fieldErrors?.workoutSelection?.[0]).toContain("no longer available");
    }
  });

  it("reads only the requested owner's active workout and performed date from persisted data", async () => {
    const owned = await create(await form());
    const otherLogId = `${prefix}-context-log`;
    await prisma.log.create({ data: { id: otherLogId, userId, title: "Other", slug: "context-other" } });
    await saveRoutine(userId, otherLogId, { name: "Other", revision: 0, workouts: [{ id: "new:B", name: "B" }], nextId: "new:B" });
    const context = (await getWorkoutSelection(userId, otherLogId))!;
    const other = await prisma.$transaction(async (tx) => startEntry(tx, userId, otherLogId, await lockWorkoutContext(tx, userId, otherLogId), {
      routineId: context.routineId, revision: context.revision, nextId: context.nextId, date: "2026-10-12", requestId: randomUUID(),
    }));
    const selected = (await getWorkoutSelection(userId, logId))!;
    expect(selected.active).toMatchObject({ id: owned.workoutEntryId, date });
    expect((await getWorkoutSelection(userId, otherLogId))!.active).toMatchObject({ id: other.id, date: "2026-10-12" });
    expect(await getWorkoutSelection("foreign-user", logId)).toBeNull();
    await endEntry(userId, logId, owned.workoutEntryId!, false);
    expect((await getWorkoutSelection(userId, logId))!.active).toBeNull();
    expect((await getWorkoutSelection(userId, otherLogId))!.active!.id).toBe(other.id);
  });
});

describe("suggestion input", () => {
  it("rejects invalid revision and missing IDs", () => {
    expect(suggestionChangeSchema.safeParse({ routineId: "", revision: -1, definitionId: "", change: { operation: "removeExercise", suggestionId: "" } }).success).toBe(false);
  });
});
