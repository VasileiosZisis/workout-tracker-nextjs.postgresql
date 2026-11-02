import { vi } from "vitest";
import RoutineSettingsPage from "@/app/(app)/routine/[logSlug]/page";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { getWorkoutPanel } from "./queries";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/features/logs/queries", () => ({ getLogBySlug: vi.fn() }));
vi.mock("@/features/workouts/queries", () => ({ getWorkoutPanel: vi.fn() }));
vi.mock("@/features/workouts/components/workout-panel", () => ({ RoutineSettings: () => null }));
vi.mock("@/features/workouts/components/delete-routine-form", () => ({ DeleteRoutineForm: () => null }));
vi.mock("@/features/workouts/components/workout-exercise-settings", () => ({ WorkoutExerciseSettings: () => null }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));

describe("routine settings page ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: "user-a", role: "USER", isDemo: false, demoExpiresAt: null });
    vi.mocked(getWorkoutPanel).mockResolvedValue(null);
  });

  it("returns not found for a foreign or missing log without reading a routine", async () => {
    vi.mocked(getLogBySlug).mockResolvedValue(null);
    await expect(RoutineSettingsPage({ params: Promise.resolve({ logSlug: "foreign-log" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getLogBySlug).toHaveBeenCalledWith({ userId: "user-a", slug: "foreign-log" });
    expect(getWorkoutPanel).not.toHaveBeenCalled();
  });

  it("loads routine settings using the authenticated owner's resolved log", async () => {
    vi.mocked(getLogBySlug).mockResolvedValue({
      id: "owned-log", userId: "user-a", title: "Strength", slug: "strength",
      createdAt: new Date("2026-11-01"), updatedAt: new Date("2026-11-01"),
    });
    await RoutineSettingsPage({ params: Promise.resolve({ logSlug: "strength" }) });
    expect(getLogBySlug).toHaveBeenCalledWith({ userId: "user-a", slug: "strength" });
    expect(getWorkoutPanel).toHaveBeenCalledWith("user-a", "owned-log");
  });

  it("does not read logs or routines when authentication redirects", async () => {
    vi.mocked(requireUser).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(RoutineSettingsPage({ params: Promise.resolve({ logSlug: "strength" }) })).rejects.toThrow("NEXT_REDIRECT");
    expect(getLogBySlug).not.toHaveBeenCalled();
    expect(getWorkoutPanel).not.toHaveBeenCalled();
  });
});
