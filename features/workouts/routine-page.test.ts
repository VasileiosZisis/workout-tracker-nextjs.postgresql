import { vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RoutineOverviewPage from "@/app/(app)/routine/[logSlug]/page";
import EditRoutinePage from "@/app/(app)/routine/[logSlug]/edit/page";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { getWorkoutPanel } from "./queries";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/features/logs/queries", () => ({ getLogBySlug: vi.fn() }));
vi.mock("@/features/workouts/queries", () => ({ getWorkoutPanel: vi.fn() }));
vi.mock("@/features/workouts/components/workout-panel", () => ({
  RoutineSettings: ({ cancelHref }: { cancelHref: string }) => `Workout editor return path: ${cancelHref}`,
}));
vi.mock("@/features/workouts/components/delete-routine-form", () => ({ DeleteRoutineForm: () => null }));
vi.mock("@/features/workouts/components/routine-setup", () => ({ RoutineSetup: () => null }));
vi.mock("@/features/workouts/components/assignment-editor", () => ({
  AssignmentEditor: ({ cancelHref }: { cancelHref: string }) => `Exercise editor return path: ${cancelHref}`,
}));
vi.mock("@/features/workouts/components/schedule-settings", () => ({
  ScheduleSettings: ({ cancelHref }: { cancelHref: string }) => `Schedule editor return path: ${cancelHref}`,
}));
vi.mock("@/features/workouts/components/routine-reset", () => ({ RoutineReset: () => null }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  redirect: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }),
}));

describe("routine settings page ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: "user-a", role: "USER", isDemo: false, demoExpiresAt: null });
    vi.mocked(getWorkoutPanel).mockResolvedValue(null);
  });

  it("returns not found for a foreign or missing log without reading a routine", async () => {
    vi.mocked(getLogBySlug).mockResolvedValue(null);
    const params = Promise.resolve({ logSlug: "foreign-log" });
    await expect(RoutineOverviewPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(EditRoutinePage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getLogBySlug).toHaveBeenCalledWith({ userId: "user-a", slug: "foreign-log" });
    expect(getWorkoutPanel).not.toHaveBeenCalled();
  });

  it("loads routine settings using the authenticated owner's resolved log", async () => {
    vi.mocked(getLogBySlug).mockResolvedValue({
      id: "owned-log", userId: "user-a", title: "Strength", slug: "strength",
      createdAt: new Date("2026-11-01"), updatedAt: new Date("2026-11-01"),
    });
    const params = Promise.resolve({ logSlug: "strength" });
    await RoutineOverviewPage({ params });
    await expect(EditRoutinePage({ params })).rejects.toThrow("NEXT_REDIRECT:/routine/strength");
    expect(getLogBySlug).toHaveBeenCalledWith({ userId: "user-a", slug: "strength" });
    expect(getWorkoutPanel).toHaveBeenCalledWith("user-a", "owned-log");
  });

  it("does not read logs or routines when authentication redirects", async () => {
    vi.mocked(requireUser).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(RoutineOverviewPage({ params: Promise.resolve({ logSlug: "strength" }) })).rejects.toThrow("NEXT_REDIRECT");
    expect(getLogBySlug).not.toHaveBeenCalled();
    expect(getWorkoutPanel).not.toHaveBeenCalled();
  });
  it("offers section editors for an existing legacy empty workout but blocks edits while active", async () => {
    const timestamp = new Date("2026-11-05");
    vi.mocked(getLogBySlug).mockResolvedValue({ id: "owned-log", userId: "user-a", title: "Strength", slug: "strength", createdAt: timestamp, updatedAt: timestamp });
    const routine: NonNullable<Awaited<ReturnType<typeof getWorkoutPanel>>> = { id: "routine", name: "Legacy split", revision: 1, nextId: "a", definitions: [{ id: "a", name: "A", exercises: [] }], schedule: null, active: null };
    vi.mocked(getWorkoutPanel).mockResolvedValue(routine);
    const params = Promise.resolve({ logSlug: "strength" });
    let html = renderToStaticMarkup(await RoutineOverviewPage({ params }));
    expect(html).toContain("Legacy split"); expect(html).toContain("<h2>A</h2>");
    expect(html).toContain("<p>Next workout · A</p>");
    expect(html).toContain('href="/routine/strength/edit"');
    expect(html).toContain('href="/logs/strength/workouts"');
    const edit = renderToStaticMarkup(await EditRoutinePage({ params }));
    expect(edit).toContain("Workout editor return path: /routine/strength");
    expect(edit).toContain("Exercise editor return path: /routine/strength");
    expect(edit).toContain("Schedule editor return path: /routine/strength");
    expect(edit).toContain('aria-label="Routine"');
    routine.schedule = {
      id: "schedule", style: "CONTINUOUS", timezone: "UTC", weekStart: 1, today: "2026-11-05",
      next: null, nextDate: null, nextDateTimezone: null, choices: [], assignments: [], nextWeekDate: "2026-11-09",
      pending: { id: "pending", style: "WEEKLY", date: "2026-11-09", timezone: "UTC" },
    };
    const pendingEdit = renderToStaticMarkup(await EditRoutinePage({ params }));
    expect(pendingEdit).toContain("Cancel the pending schedule change");
    expect(pendingEdit).toContain('aria-label="Edit routine sections"');
    expect(pendingEdit).not.toContain("Workout editor return path");
    expect(pendingEdit).toContain("Exercise editor return path: /routine/strength");
    expect(pendingEdit).toContain("Schedule editor return path: /routine/strength");
    routine.active = { id: "entry", slug: "a-2026-10-12", definitionId: "a", name: "A", date: "2026-10-12", sessions: [], plannedName: null, scheduledDate: null };
    html = renderToStaticMarkup(await RoutineOverviewPage({ params }));
    expect(html).toContain("Continue workout");
    expect(html).not.toContain('href="/routine/strength/edit"');
    const blockedEdit = renderToStaticMarkup(await EditRoutinePage({ params }));
    expect(blockedEdit).toContain("<p>A is in progress</p>");
    expect(blockedEdit).not.toContain('aria-label="Edit routine sections"');
  });
});
