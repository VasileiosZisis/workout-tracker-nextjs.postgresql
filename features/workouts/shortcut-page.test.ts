import { vi } from "vitest";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import NewSessionPage from "@/app/(app)/logs/[logSlug]/exercises/[exerciseSlug]/weightlifting/new/page";
import { WeightliftingSessionForm } from "@/features/weightlifting/components/weightlifting-session-form";
import { requireUser } from "@/lib/auth";
import { getLatestWeightliftingSession, getWeightliftingExerciseBySlug } from "@/features/weightlifting/queries";
import { getWorkoutSelection } from "./queries";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/features/weightlifting/actions", () => ({ createWeightliftingSessionAction: vi.fn() }));
vi.mock("@/features/weightlifting/queries", () => ({ getLatestWeightliftingSession: vi.fn(), getWeightliftingExerciseBySlug: vi.fn() }));
vi.mock("@/features/workouts/queries", () => ({ getWorkoutSelection: vi.fn() }));
vi.mock("@/features/weightlifting/components/weightlifting-session-form", () => ({ WeightliftingSessionForm: () => null }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));

type FormElement = ReactElement<ComponentProps<typeof WeightliftingSessionForm>>;
function sessionForm(node: ReactNode): FormElement | undefined {
  if (!isValidElement<{ children?: ReactNode }>(node)) return;
  if (node.type === WeightliftingSessionForm) return node as FormElement;
  for (const child of Children.toArray(node.props.children)) {
    const found = sessionForm(child);
    if (found) return found;
  }
}
function page(workoutEntryId?: string | string[]) {
  return NewSessionPage({
    params: Promise.resolve({ logSlug: "strength", exerciseSlug: "squat" }),
    searchParams: Promise.resolve(workoutEntryId === undefined ? {} : { workoutEntryId }),
  });
}

describe("workout logging shortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: "user-a", role: "USER", isDemo: false, demoExpiresAt: null });
    const createdAt = new Date("2026-11-01");
    vi.mocked(getWeightliftingExerciseBySlug).mockResolvedValue({
      id: "squat", userId: "user-a", logId: "owned-log", title: "Squat", slug: "squat", sessionKind: "WEIGHTLIFTING", createdAt, updatedAt: createdAt,
      log: { id: "owned-log", userId: "user-a", title: "Strength", slug: "strength", createdAt, updatedAt: createdAt },
    });
    vi.mocked(getLatestWeightliftingSession).mockResolvedValue(null);
    vi.mocked(getWorkoutSelection).mockResolvedValue({
      routineId: "routine", revision: 4, nextId: "definition-a", nextName: "A",
      active: { id: "active-entry", slug: "a-2026-10-12", name: "A", date: "2026-10-12" },
    });
  });

  it("prefills the requested active workout date, including an older performed date", async () => {
    const form = sessionForm(await page("active-entry"));
    expect(form).toBeDefined();
    expect(form!.props.defaultPerformedDate).toBe("2026-10-12");
    expect(form!.props.workout?.active?.id).toBe("active-entry");
    expect(form!.props.exerciseId).toBe("squat");
    expect(form!.props.returnWorkoutEntryId).toBe("active-entry");
    const footer = form!.props.footer as ReactElement<{ children: ReactNode }>;
    const cancel = Children.toArray(footer.props.children)[0] as ReactElement<{ href: string }>;
    expect(cancel.props.href).toBe("/logs/strength/workouts/a-2026-10-12");
    expect(getWorkoutSelection).toHaveBeenCalledWith("user-a", "owned-log");
    expect(getWeightliftingExerciseBySlug).toHaveBeenCalledWith({ userId: "user-a", logSlug: "strength", exerciseSlug: "squat" });
  });

  it.each([{ entry: "foreign-or-ended-entry" }, { entry: "" }, { entry: ["active-entry", "other-entry"] }])("rejects invalid shortcut input %j instead of falling back to standalone", async ({ entry }) => {
    await expect(page(entry)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("rejects a shortcut when the owned log has no active workout", async () => {
    vi.mocked(getWorkoutSelection).mockResolvedValue({ routineId: "routine", revision: 4, nextId: "definition-a", nextName: "A", active: null });
    await expect(page("active-entry")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("rejects another user's or another log's exercise before loading workout context", async () => {
    vi.mocked(getWeightliftingExerciseBySlug).mockResolvedValue(null);
    await expect(page("active-entry")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getWorkoutSelection).not.toHaveBeenCalled();
  });

  it("retains browser-local date defaults when opened without a shortcut", async () => {
    const form = sessionForm(await page());
    expect(form!.props.defaultPerformedDate).toBeUndefined();
    expect(form!.props.returnWorkoutEntryId).toBeUndefined();
  });
  it("uses the confirmed routine-local date for a configured schedule", async () => {
    const current = (await getWorkoutSelection("user-a", "owned-log"))!;
    vi.mocked(getWorkoutSelection).mockResolvedValue({ ...current, active: null, schedule: {
      id: "schedule", style: "WEEKLY", timezone: "Pacific/Kiritimati", today: "2026-11-03", weekStart: 1,
      next: null, nextDate: null, nextDateTimezone: null, choices: [], assignments: [], pending: null, nextWeekDate: "2026-11-09",
    } });
    const form = sessionForm(await page());
    expect(form!.props.defaultPerformedDate).toBe("2026-11-03");
  });
});
