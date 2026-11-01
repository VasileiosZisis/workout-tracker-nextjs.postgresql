import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { workoutAction } from "./actions";
import { saveRoutine } from "./service";
import { getWorkoutSelection } from "./queries";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const prefix = `workout-action-${randomUUID()}`;
const userId = `${prefix}-user`;
const logId = `${prefix}-log`;

describe("workout actions", () => {
  beforeEach(async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: userId, role: "USER", isDemo: false, demoExpiresAt: null });
    await prisma.user.create({ data: { id: userId } });
    await prisma.log.create({ data: { id: logId, userId, title: "Strength", slug: "strength" } });
    await saveRoutine(userId, logId, { name: "Split", revision: 0, workouts: ["A", "B"].map((name) => ({ id: `new:${name}`, name })), nextId: "new:A" });
  });
  afterEach(async () => { vi.clearAllMocks(); await prisma.user.deleteMany({ where: { id: userId } }); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("starts through the panel action and enforces discard confirmation server-side", async () => {
    const current = (await getWorkoutSelection(userId, logId))!;
    const start = new FormData();
    start.set("logId", logId); start.set("operation", "start"); start.set("routineId", current.routineId);
    start.set("revision", String(current.revision)); start.set("nextId", current.nextId);
    start.set("performedDate", "2026-11-01"); start.set("requestId", randomUUID());
    expect((await workoutAction({}, start)).success).toBeDefined();
    expect((await workoutAction({}, start)).success).toBeDefined();
    const entry = (await getWorkoutSelection(userId, logId))!.active!;
    await prisma.exercise.create({ data: { id: `${prefix}-exercise`, userId, logId, title: "Squat", slug: "squat", sessionKind: "WEIGHTLIFTING" } });
    const session = await prisma.weightliftingSession.create({ data: { userId, logId, exerciseId: `${prefix}-exercise`, performedAt: new Date("2026-11-01T00:00:00.000Z"), workoutEntryId: entry.id } });
    const discard = new FormData(); discard.set("logId", logId); discard.set("operation", "discard"); discard.set("entryId", entry.id);
    expect((await workoutAction({}, discard)).error).toContain("Confirm");
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: session.id } })).workoutEntryId).toBe(entry.id);
    expect((await getWorkoutSelection(userId, logId))!.active!.id).toBe(entry.id);
    discard.set("confirmed", "yes");
    expect((await workoutAction({}, discard)).success).toBeDefined();
    expect((await workoutAction({}, discard)).success).toBeDefined();
    expect((await prisma.weightliftingSession.findUniqueOrThrow({ where: { id: session.id } })).workoutEntryId).toBeNull();
    const after = (await getWorkoutSelection(userId, logId))!;
    expect(after.nextId).toBe(current.nextId);
    expect(after.active).toBeNull();
    expect(await prisma.workoutEntry.count({ where: { logId } })).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/logs/strength", "layout");
  });

  it("rejects foreign logs and malformed routine input without changing the routine", async () => {
    const form = new FormData(); form.set("logId", "foreign"); form.set("operation", "start");
    expect((await workoutAction({}, form)).error).toBe("Log not found.");
    form.set("logId", logId); form.set("operation", "save"); form.set("workouts", "malformed");
    expect((await workoutAction({}, form)).error).toBeDefined();
    expect((await getWorkoutSelection(userId, logId))!.revision).toBe(1);
  });
});
