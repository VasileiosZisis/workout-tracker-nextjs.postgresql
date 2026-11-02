import { SessionKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createWeightliftingSessionAction,
  updateWeightliftingSessionAction,
  deleteWeightliftingSessionAction,
} from "./actions";
import { vi } from "vitest";
import { randomUUID } from "node:crypto";
import { endEntry, lockWorkoutContext, saveRoutine, startEntry } from "@/features/workouts/service";
import { getWorkoutSelection } from "@/features/workouts/queries";
import { deleteExerciseAction, updateExerciseAction } from "@/features/exercises/actions";
import { saveSchedule } from "@/features/workouts/scheduling";

// These workflows make multiple round trips to the remote development database.
// Let the test finish before afterEach starts deleting its fixtures.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const testRunId = `weightlifting-action-${Date.now()}`;
const userId = `${testRunId}-user`;
const logId = `${testRunId}-log`;
const exerciseId = `${testRunId}-exercise`;

function validFormData() {
  const formData = new FormData();
  formData.set("exerciseId", exerciseId);
  formData.set("requestId", randomUUID());
  formData.set("performedDate", "2026-05-17");
  formData.set("setCount", "2");
  formData.set("sets.0.repetitions", "10");
  formData.set("sets.0.kilograms", "50");
  formData.set("sets.1.repetitions", "5");
  formData.set("sets.1.kilograms", "100");
  formData.set("sets.1.isHard", "on");
  return formData;
}

function sessionForm(date = "2026-05-17") {
  const form = new FormData();
  form.set("exerciseId", exerciseId);
  form.set("requestId", randomUUID());
  form.set("performedDate", date);
  form.set("setCount", "1");
  form.set("sets.0.repetitions", "10");
  form.set("sets.0.kilograms", "50");
  form.set("sets.0.isHard", "on");
  return form;
}
async function routine() {
  await saveRoutine(userId, logId, { name: "Split", revision: 0, workouts: ["A", "B", "C"].map((name) => ({ id: `new:${name}`, name })), nextId: "new:A" });
  return (await getWorkoutSelection(userId, logId))!;
}
function selectStart(form: FormData, current: NonNullable<Awaited<ReturnType<typeof getWorkoutSelection>>>) {
  form.set("workoutSelection", "start");
  form.set("routineId", current.routineId);
  form.set("routineRevision", String(current.revision));
  form.set("nextDefinitionId", current.nextId);
}
async function create(form: FormData) {
  await expect(createWeightliftingSessionAction({}, form)).rejects.toThrow("NEXT_REDIRECT");
  return prisma.weightliftingSession.findUniqueOrThrow({ where: { userId_requestId: { userId, requestId: String(form.get("requestId")) } } });
}

describe("weightlifting actions", () => {
  beforeEach(async () => {
    vi.mocked(requireUser).mockResolvedValue({
      id: userId,
      role: "USER",
      isDemo: false,
      demoExpiresAt: null,
    });

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name: "Weightlifting Action User",
      },
    });

    await prisma.log.create({
      data: {
        id: logId,
        userId,
        title: "Strength Log",
        slug: "strength-log",
      },
    });

    await prisma.exercise.create({
      data: {
        id: exerciseId,
        userId,
        logId,
        title: "Bench Press",
        slug: "bench-press",
        sessionKind: SessionKind.WEIGHTLIFTING,
      },
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();

    await prisma.user.deleteMany({
      where: { id: userId },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores metrics recalculated from sets instead of submitted totals", async () => {
    const formData = validFormData();
    formData.set("totalVolume", "999999");
    formData.set("workingVolume", "999999");
    formData.set("junkVolume", "999999");

    await expect(createWeightliftingSessionAction({}, formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    const session = await prisma.weightliftingSession.findFirstOrThrow({
      where: {
        userId,
        exerciseId,
      },
      include: {
        sets: {
          orderBy: { position: "asc" },
        },
      },
    });

    expect(Number(session.totalVolume)).toBe(1000);
    expect(Number(session.workingVolume)).toBe(500);
    expect(Number(session.junkVolume)).toBe(500);
    expect(Number(session.sets[0].volume)).toBe(500);
    expect(Number(session.sets[1].volume)).toBe(500);
    expect(redirect).toHaveBeenCalledWith(
      `/logs/strength-log/exercises/bench-press/weightlifting/${session.id}`,
    );
  });

  it("rejects an impossible create date without inserting a session", async () => {
    const formData = validFormData();
    formData.set("performedDate", "2026-02-31");

    const result = await createWeightliftingSessionAction({}, formData);

    expect(result.fieldErrors?.performedDate).toEqual(["Use a valid date."]);
    expect(await prisma.weightliftingSession.count({ where: { userId } })).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("preserves the session and sets when an edited date is impossible", async () => {
    const original = await prisma.weightliftingSession.create({
      data: {
        userId,
        logId,
        exerciseId,
        performedAt: new Date("2026-05-16T00:00:00.000Z"),
        totalVolume: "320.00",
        junkVolume: "320.00",
        workingVolume: "0.00",
        sets: {
          create: {
            position: 1,
            repetitions: "8.00",
            kilograms: "40.00",
            isHard: false,
            volume: "320.00",
          },
        },
      },
      include: { sets: { orderBy: { position: "asc" } } },
    });
    const formData = validFormData();
    formData.set("sessionId", original.id);
    formData.set("performedDate", "2026-02-31");

    const result = await updateWeightliftingSessionAction({}, formData);
    const unchanged = await prisma.weightliftingSession.findUniqueOrThrow({
      where: { id: original.id },
      include: { sets: { orderBy: { position: "asc" } } },
    });

    expect(result.fieldErrors?.performedDate).toEqual(["Use a valid date."]);
    expect(unchanged).toEqual(original);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("starts from the session form and retries without duplicate sessions, sets, or entries", async () => {
    const current = await routine();
    const form = sessionForm();
    selectStart(form, current);
    const [first, retry] = await Promise.all([create(form), create(form)]);
    expect(first.id).toBe(retry.id);
    expect(first.workoutEntryId).not.toBeNull();
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(1);
    expect(await prisma.weightliftingSession.count({ where: { logId } })).toBe(1);
    expect(await prisma.weightliftingSet.count({ where: { sessionId: first.id } })).toBe(1);
    expect(Number(first.workingVolume)).toBe(500);
  });

  it("rejects changed creation inputs but permits an exact retry after the saved session is edited", async () => {
    const form = sessionForm();
    const original = await create(form);
    form.set("sets.0.kilograms", "60");
    expect((await createWeightliftingSessionAction({}, form)).fieldErrors?.workoutSelection?.[0]).toContain("different inputs");
    form.set("sets.0.kilograms", "50");
    form.set("workoutSelection", "start");
    expect((await createWeightliftingSessionAction({}, form)).fieldErrors?.workoutSelection?.[0]).toContain("different inputs");
    form.set("workoutSelection", "standalone");
    const edit = sessionForm("2026-05-18"); edit.set("sessionId", original.id); edit.set("sets.0.kilograms", "60");
    await expect(updateWeightliftingSessionAction({}, edit)).rejects.toThrow("NEXT_REDIRECT");
    expect((await create(form)).id).toBe(original.id);
    const updated = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: original.id } });
    expect(Number(updated.workingVolume)).toBe(600);
    expect(updated.performedAt.toISOString().slice(0, 10)).toBe("2026-05-18");
    expect(await prisma.weightliftingSession.count({ where: { logId } })).toBe(1);
  });

  it("joins a panel-started workout and leaves standalone sessions separate", async () => {
    const current = await routine();
    const entry = await prisma.$transaction(async (tx) => startEntry(tx, userId, logId, await lockWorkoutContext(tx, userId, logId), {
      routineId: current.routineId, revision: current.revision, nextId: current.nextId, date: "2026-05-17", requestId: randomUUID(),
    }));
    const form = sessionForm();
    form.set("workoutSelection", entry.id);
    expect((await create(form)).workoutEntryId).toBe(entry.id);
    expect((await create(sessionForm())).workoutEntryId).toBeNull();
    expect((await getWorkoutSelection(userId, logId))?.active?.id).toBe(entry.id);
  });

  it("rejects mismatched dates, ended entries, stale starts, and invalid dates without partial writes", async () => {
    const current = await routine();
    const form = sessionForm(); selectStart(form, current);
    const first = await create(form);
    const mismatch = sessionForm("2026-05-18"); mismatch.set("workoutSelection", first.workoutEntryId!);
    expect((await createWeightliftingSessionAction({}, mismatch)).fieldErrors?.workoutSelection).toBeDefined();
    const stale = sessionForm(); selectStart(stale, current);
    expect((await createWeightliftingSessionAction({}, stale)).fieldErrors?.workoutSelection).toBeDefined();
    await endEntry(userId, logId, first.workoutEntryId!, false);
    const ended = sessionForm(); ended.set("workoutSelection", first.workoutEntryId!);
    expect((await createWeightliftingSessionAction({}, ended)).fieldErrors?.workoutSelection).toBeDefined();
    const invalid = sessionForm("2026-02-30");
    expect((await createWeightliftingSessionAction({}, invalid)).fieldErrors?.performedDate).toBeDefined();
    expect(await prisma.weightliftingSession.count({ where: { logId } })).toBe(1);
  });

  it("requires explicit detach to edit dates and never rewinds completed rotation", async () => {
    const current = await routine();
    const form = sessionForm(); selectStart(form, current);
    const session = await create(form);
    await endEntry(userId, logId, session.workoutEntryId!, false);
    const next = (await getWorkoutSelection(userId, logId))!.nextId;
    const edit = sessionForm("2026-05-18"); edit.set("sessionId", session.id); edit.set("workoutSelection", session.workoutEntryId!);
    expect((await updateWeightliftingSessionAction({}, edit)).fieldErrors?.workoutSelection).toBeDefined();
    edit.set("workoutSelection", "standalone");
    await expect(updateWeightliftingSessionAction({}, edit)).rejects.toThrow("NEXT_REDIRECT");
    const updated = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(updated.workoutEntryId).toBeNull();
    expect(updated.performedAt.toISOString().slice(0, 10)).toBe("2026-05-18");
    expect(Number(updated.workingVolume)).toBe(500);
    expect((await getWorkoutSelection(userId, logId))!.nextId).toBe(next);
  });

  it.each([false, true])("keeps the association and next step when editing linked sets (completed=%s)", async (completed) => {
    const current = await routine();
    const form = sessionForm(); selectStart(form, current);
    const session = await create(form);
    if (completed) await endEntry(userId, logId, session.workoutEntryId!, false);
    const before = await getWorkoutSelection(userId, logId);
    const edit = sessionForm(); edit.set("sessionId", session.id); edit.set("workoutSelection", session.workoutEntryId!); edit.set("sets.0.kilograms", "60");
    await expect(updateWeightliftingSessionAction({}, edit)).rejects.toThrow("NEXT_REDIRECT");
    const updated = await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(updated.workoutEntryId).toBe(session.workoutEntryId);
    expect(Number(updated.workingVolume)).toBe(600);
    expect((await getWorkoutSelection(userId, logId))!.nextId).toBe(before!.nextId);
    expect((await prisma.workoutEntry.findUniqueOrThrow({ where: { id: session.workoutEntryId! } })).status).toBe(completed ? "COMPLETED" : "IN_PROGRESS");
  });

  it("keeps an active entry after its last session or exercise is deleted", async () => {
    const current = await routine();
    const form = sessionForm(); selectStart(form, current);
    const session = await create(form);
    const remove = new FormData(); remove.set("sessionId", session.id);
    await expect(deleteWeightliftingSessionAction(remove)).rejects.toThrow("NEXT_REDIRECT");
    await expect(endEntry(userId, logId, session.workoutEntryId!, false)).rejects.toThrow("at least one");
    const second = sessionForm(); second.set("workoutSelection", session.workoutEntryId!);
    await create(second);
    const removeExercise = new FormData(); removeExercise.set("exerciseId", exerciseId);
    await expect(deleteExerciseAction(removeExercise)).rejects.toThrow("NEXT_REDIRECT");
    expect((await getWorkoutSelection(userId, logId))?.active?.id).toBe(session.workoutEntryId);
    await expect(endEntry(userId, logId, session.workoutEntryId!, false)).rejects.toThrow("at least one");
  });

  it("blocks changing a linked exercise to pace", async () => {
    const current = await routine();
    const form = sessionForm(); selectStart(form, current);
    await create(form);
    const edit = new FormData(); edit.set("exerciseId", exerciseId); edit.set("title", "Bench Press"); edit.set("sessionKind", "PACE");
    expect((await updateExerciseAction({}, edit)).fieldErrors?.sessionKind).toEqual([
      "Session type cannot be changed after sessions have been added.",
    ]);
    expect((await prisma.exercise.findUniqueOrThrow({ where: { id: exerciseId } })).sessionKind).toBe("WEIGHTLIFTING");
  });

  it("serializes Finish against a simultaneous session save", async () => {
    const current = await routine();
    const form = sessionForm(); selectStart(form, current);
    const first = await create(form);
    const second = sessionForm(); second.set("workoutSelection", first.workoutEntryId!);
    const [finish, save] = await Promise.allSettled([endEntry(userId, logId, first.workoutEntryId!, false), createWeightliftingSessionAction({}, second)]);
    expect(finish.status).toBe("fulfilled");
    const entry = await prisma.workoutEntry.findUniqueOrThrow({ where: { id: first.workoutEntryId! } });
    expect(entry.status).toBe("COMPLETED");
    const count = await prisma.weightliftingSession.count({ where: { workoutEntryId: entry.id } });
    if (save.status === "rejected") {
      expect(save.reason).toBeInstanceOf(Error);
      expect((save.reason as Error).message).toContain("NEXT_REDIRECT");
      expect(count).toBe(2);
    } else {
      expect(save.value.fieldErrors?.workoutSelection?.[0]).toContain("in-progress workout");
      expect(count).toBe(1);
    }
    expect((await getWorkoutSelection(userId, logId))?.active).toBeNull();
  });

  it("creates a scheduled substitution atomically, learns it once, and rejects changed-intent retries", async () => {
    const initial = await routine();
    await saveSchedule(userId, logId, { routineId: initial.routineId, revision: initial.revision, style: "WEEKLY", timezone: "UTC", weekStart: 1, effective: "today", confirmed: "yes", expectedScheduleId: "", expectedToday: initial.schedule!.today, assignments: [] });
    const current = (await getWorkoutSelection(userId, logId))!, schedule = current.schedule!;
    const chosen = current.definitions![2];
    const form = sessionForm(schedule.today); selectStart(form, current);
    for (const [key, value] of Object.entries({ schedulingIntent: "SCHEDULED", scheduleId: schedule.id, slotKey: schedule.next!.key, chosenDefinitionId: chosen.id, scheduleToday: schedule.today })) form.set(key, value);
    const first = await create(form), retry = await create(form);
    expect(first.id).toBe(retry.id);
    const entry = await prisma.workoutEntry.findUniqueOrThrow({ where: { id: first.workoutEntryId! } });
    expect(entry.definitionId).toBe(chosen.id); expect(entry.plannedName).toBe("A");
    expect(await prisma.workoutExercise.count({ where: { definitionId: chosen.id, exerciseId } })).toBe(1);
    expect(await prisma.weightliftingSession.count({ where: { logId } })).toBe(1);
    const sets = await prisma.weightliftingSet.findMany({ where: { sessionId: first.id } });
    form.set("schedulingIntent", "EXTRA");
    expect((await createWeightliftingSessionAction({}, form)).fieldErrors?.workoutSelection?.[0]).toContain("different inputs");
    expect(await prisma.weightliftingSet.findMany({ where: { sessionId: first.id } })).toEqual(sets);
    expect((await getWorkoutSelection(userId, logId))!.nextId).toBe(current.nextId);
    expect(revalidatePath).toHaveBeenCalledWith("/routine/strength-log");
  });

  it("rejects an entry from another log, user, or demo workspace", async () => {
    const current = await routine();
    const first = sessionForm(); selectStart(first, current); const session = await create(first);
    const otherUser = `${testRunId}-demo`;
    try {
      await prisma.user.create({ data: { id: otherUser, demoExpiresAt: new Date(Date.now() + 3600000) } });
      await prisma.log.create({ data: { id: `${testRunId}-other-log`, userId: otherUser, title: "Other", slug: "other" } });
      await prisma.exercise.create({ data: { id: `${testRunId}-other-exercise`, userId: otherUser, logId: `${testRunId}-other-log`, title: "Squat", slug: "squat", sessionKind: "WEIGHTLIFTING" } });
      vi.mocked(requireUser).mockResolvedValue({ id: otherUser, role: "USER", isDemo: true, demoExpiresAt: new Date(Date.now() + 3600000) });
      const malicious = sessionForm(); malicious.set("exerciseId", `${testRunId}-other-exercise`); malicious.set("workoutSelection", session.workoutEntryId!);
      expect((await createWeightliftingSessionAction({}, malicious)).fieldErrors?.workoutSelection).toBeDefined();
      expect(await prisma.weightliftingSession.count({ where: { userId: otherUser } })).toBe(0);
      vi.mocked(requireUser).mockResolvedValue({ id: userId, role: "USER", isDemo: false, demoExpiresAt: null });
      await prisma.log.create({ data: { id: `${testRunId}-same-user-log`, userId, title: "Second", slug: "second" } });
      await prisma.exercise.create({ data: { id: `${testRunId}-same-user-exercise`, userId, logId: `${testRunId}-same-user-log`, title: "Row", slug: "row", sessionKind: "WEIGHTLIFTING" } });
      malicious.set("exerciseId", `${testRunId}-same-user-exercise`);
      expect((await createWeightliftingSessionAction({}, malicious)).fieldErrors?.workoutSelection).toBeDefined();
    } finally {
      await prisma.user.deleteMany({ where: { id: otherUser } });
    }
  });
});
