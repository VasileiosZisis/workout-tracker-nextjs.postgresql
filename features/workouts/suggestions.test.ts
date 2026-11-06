import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { changeWorkoutSuggestions, suggestionChangeSchema } from "./suggestions";
import { endEntry } from "./service";
import { createWorkoutFixture } from "@/tests/fixtures/workout";
import { getWorkoutPanel, getWorkoutSelection } from "./queries";
import { createWeightliftingSessionAction, updateWeightliftingSessionAction, deleteWeightliftingSessionAction } from "@/features/weightlifting/actions";
import { deleteExerciseAction, updateExerciseAction } from "@/features/exercises/actions";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }), notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });
const prefix = `assignments-session-${randomUUID()}`, userId = `${prefix}-user`, logId = `${prefix}-log`, exerciseId = `${prefix}-exercise`, otherId = `${prefix}-other`;
const panel = async () => (await getWorkoutPanel(userId, logId))!;
async function form(exercise = exerciseId, standalone = false) {
  const current = (await getWorkoutSelection(userId, logId))!;
  const data = new FormData();
  for (const [key, value] of Object.entries({ exerciseId: exercise, requestId: randomUUID(), performedDate: "2026-05-17", setCount: "1", "sets.0.repetitions": "10", "sets.0.kilograms": "50", "sets.0.isHard": "on", workoutSelection: standalone ? "standalone" : current.active?.id ?? "start", routineId: current.routineId, routineRevision: String(current.revision), nextDefinitionId: current.nextId })) data.set(key, value);
  return data;
}
async function create(data: FormData) {
  await expect(createWeightliftingSessionAction({}, data)).rejects.toThrow("NEXT_REDIRECT");
  return prisma.weightliftingSession.findUniqueOrThrow({ where: { userId_requestId: { userId, requestId: String(data.get("requestId")) } } });
}
describe("explicit workout assignments during logging", () => {
  beforeEach(async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: userId, role: "USER", isDemo: false, demoExpiresAt: null });
    await prisma.user.create({ data: { id: userId } });
    await prisma.log.create({ data: { id: logId, userId, title: "Strength", slug: "strength" } });
    await prisma.exercise.createMany({ data: [exerciseId, otherId].map((id, index) => ({ id, userId, logId, title: `Exercise ${index}`, slug: `exercise-${index}`, sessionKind: "WEIGHTLIFTING" as const })) });
    await createWorkoutFixture(userId, logId, [{ name: "A", exerciseIds: [exerciseId] }]);
  });
  afterEach(async () => { vi.clearAllMocks(); await prisma.user.deleteMany({ where: { id: userId } }); });
  afterAll(async () => { await prisma.$disconnect(); });
  it("never teaches assignments from standalone, linked, retried, or concurrent new sessions", async () => {
    await create(await form(otherId, true));
    const data = await form(otherId); const [first, retry] = await Promise.all([create(data), create(data)]);
    expect(first.id).toBe(retry.id);
    await Promise.all([create(await form(otherId)), create(await form(exerciseId))]);
    expect((await panel()).definitions[0].exercises.map((item) => item.exercise.id)).toEqual([exerciseId]);
    expect(await prisma.weightliftingSession.count({ where: { logId } })).toBe(4);
    expect(await prisma.weightliftingSet.count({ where: { session: { logId } } })).toBe(4);
  });
  it("preserves assignments across discard, omission, detachment, edits, and deletion", async () => {
    const first = await create(await form(otherId)); await endEntry(userId, logId, first.workoutEntryId!, true);
    const second = await create(await form()); await endEntry(userId, logId, second.workoutEntryId!, false);
    const edit = await form(exerciseId, true); edit.set("sessionId", second.id); edit.set("sets.0.kilograms", "60");
    await expect(updateWeightliftingSessionAction({}, edit)).rejects.toThrow("NEXT_REDIRECT");
    expect(Number((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: second.id } })).workingVolume)).toBe(600);
    const deletion = new FormData(); deletion.set("sessionId", second.id);
    await expect(deleteWeightliftingSessionAction(deletion)).rejects.toThrow("NEXT_REDIRECT");
    expect((await panel()).definitions[0].exercises.map((item) => item.exercise.id)).toEqual([exerciseId]);
  });
  it("does not restore a removed assignment through a retry, edit, or genuinely new session", async () => {
    const data = await form(); const session = await create(data); await endEntry(userId, logId, session.workoutEntryId!, false);
    const current = await panel();
    await changeWorkoutSuggestions(userId, logId, { routineId: current.id, revision: current.revision, definitionId: current.nextId, change: { operation: "removeExercise", suggestionId: current.definitions[0].exercises[0].id } });
    await create(data);
    const edit = await form(); edit.set("sessionId", session.id); edit.set("workoutSelection", session.workoutEntryId!);
    await expect(updateWeightliftingSessionAction({}, edit)).rejects.toThrow("NEXT_REDIRECT");
    await create(await form());
    expect((await panel()).definitions[0].exercises).toHaveLength(0);
  });
  it("keeps exercise rename/deletion and session-kind restrictions safe", async () => {
    const current = await panel();
    const edit = new FormData(); edit.set("exerciseId", exerciseId); edit.set("title", "Renamed Exercise"); edit.set("sessionKind", "WEIGHTLIFTING");
    await expect(updateExerciseAction({}, edit)).rejects.toThrow("NEXT_REDIRECT");
    expect((await panel()).definitions[0].exercises[0].exercise.title).toBe("Renamed Exercise");
    await create(await form()); edit.set("sessionKind", "PACE");
    expect((await updateExerciseAction({}, edit)).fieldErrors?.sessionKind).toBeDefined();
    const deletion = new FormData(); deletion.set("exerciseId", exerciseId);
    await expect(deleteExerciseAction(deletion)).rejects.toThrow("NEXT_REDIRECT");
    expect((await panel()).definitions[0].exercises).toHaveLength(0);
    expect(await prisma.workoutEntry.count({ where: { routineId: current.id } })).toBe(1);
  });
  it("serializes a kind change against a simultaneous standalone save", async () => {
    const data = await form(otherId, true);
    const edit = new FormData(); edit.set("exerciseId", otherId); edit.set("title", "Other"); edit.set("sessionKind", "PACE");
    const [save, change] = await Promise.allSettled([createWeightliftingSessionAction({}, data), updateExerciseAction({}, edit)]);
    const sessions = await prisma.weightliftingSession.count({ where: { exerciseId: otherId } });
    const current = await prisma.exercise.findUniqueOrThrow({ where: { id: otherId } });
    if (sessions) {
      expect(current.sessionKind).toBe("WEIGHTLIFTING"); expect(save.status).toBe("rejected");
      if (save.status === "rejected") expect((save.reason as Error).message).toContain("NEXT_REDIRECT");
      expect(change.status).toBe("fulfilled");
      if (change.status === "fulfilled") {
        // The session can win before the initial read or while the edit waits
        // for the log lock. Both validation paths reject the same kind change.
        expect(change.value.fieldErrors?.sessionKind?.[0] ?? change.value.formError)
          .toBe("Session type cannot be changed after sessions have been added.");
      }
    } else {
      expect(current.sessionKind).toBe("PACE"); expect(change.status).toBe("rejected");
      if (change.status === "rejected") expect((change.reason as Error).message).toContain("NEXT_REDIRECT");
      if (save.status === "rejected") expect((save.reason as Error).message).toContain("NEXT_NOT_FOUND");
      else expect(save.value.fieldErrors?.workoutSelection?.[0]).toContain("no longer available");
    }
  });
  it("cleans assignments when a session-free exercise changes kind", async () => {
    const edit = new FormData(); edit.set("exerciseId", exerciseId); edit.set("title", "Exercise 0"); edit.set("sessionKind", "PACE");
    await expect(updateExerciseAction({}, edit)).rejects.toThrow("NEXT_REDIRECT");
    expect((await panel()).definitions[0].exercises).toHaveLength(0);
  });
});
describe("legacy assignment input validation", () => {
  it("rejects malformed IDs and revisions", () => { expect(suggestionChangeSchema.safeParse({ routineId: "", revision: -1, definitionId: "", change: { operation: "removeExercise", suggestionId: "" } }).success).toBe(false); });
});
