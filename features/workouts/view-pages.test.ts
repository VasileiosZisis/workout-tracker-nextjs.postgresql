import { vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LogPage from "@/app/(app)/logs/[logSlug]/page";
import DetailPage from "@/app/(app)/logs/[logSlug]/workouts/[entryId]/page";
import StartPage from "@/app/(app)/logs/[logSlug]/workouts/start/page";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { getExercisesPage } from "@/features/exercises/queries";
import { getActiveWorkoutDetail, getWorkoutPanel, getWorkoutSummary, getWorkoutSelection } from "./queries";
import { getWorkoutHistoryDetail } from "./history-queries";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/features/logs/queries", () => ({ getLogBySlug: vi.fn() }));
vi.mock("@/features/exercises/queries", () => ({ getExercisesPage: vi.fn() }));
vi.mock("./queries", () => ({ getActiveWorkoutDetail: vi.fn(), getWorkoutPanel: vi.fn(), getWorkoutSummary: vi.fn(), getWorkoutSelection: vi.fn() }));
vi.mock("./history-queries", () => ({ getWorkoutHistoryDetail: vi.fn() }));
vi.mock("./components/workout-summary", () => ({ WorkoutSummary: () => null }));
vi.mock("./components/active-workout", () => ({ ActiveWorkout: () => null }));
vi.mock("./components/workout-start-controls", () => ({ WorkoutStartControls: () => null }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }), redirect: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }), permanentRedirect: vi.fn((path: string) => { throw new Error(`NEXT_PERMANENT_REDIRECT:${path}`); }) }));
const params = () => Promise.resolve({ logSlug: "strength", entryId: "push-2026-10-12" });
const searchParams = () => Promise.resolve({});
const pagination = { page: 1, limit: 12, totalItems: 0, totalPages: 1 };
describe("dedicated workout route boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: "owner", role: "USER", isDemo: false, demoExpiresAt: null });
    const now = new Date("2026-11-05");
    vi.mocked(getLogBySlug).mockResolvedValue({ id: "owned-log", userId: "owner", title: "Strength", slug: "strength", createdAt: now, updatedAt: now });
    vi.mocked(getWorkoutSummary).mockResolvedValue(null);
    vi.mocked(getExercisesPage).mockResolvedValue({ exercises: [], pagination });
    vi.mocked(getWorkoutSelection).mockResolvedValue(null);
    vi.mocked(getActiveWorkoutDetail).mockResolvedValue(null);
    vi.mocked(getWorkoutHistoryDetail).mockResolvedValue(null);
  });
  it("keeps the ordinary exercise library and uses only the summary query on the log", async () => {
    const html = renderToStaticMarkup(await LogPage({ params: params(), searchParams: searchParams() }));
    expect(html).toContain("Add exercise"); expect(html).not.toContain("Workout history");
    expect(getWorkoutSummary).toHaveBeenCalledWith("owner", "owned-log");
    expect(getWorkoutPanel).not.toHaveBeenCalled();
    expect(getActiveWorkoutDetail).not.toHaveBeenCalled();
  });
  it("blocks foreign logs before summary, workout, or start reads", async () => {
    vi.mocked(getLogBySlug).mockResolvedValue(null);
    await expect(LogPage({ params: params(), searchParams: searchParams() })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(DetailPage({ params: params(), searchParams: searchParams() })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(StartPage({ params: params() })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getWorkoutSummary).not.toHaveBeenCalled(); expect(getWorkoutHistoryDetail).not.toHaveBeenCalled(); expect(getWorkoutSelection).not.toHaveBeenCalled();
    expect(getActiveWorkoutDetail).not.toHaveBeenCalled(); expect(getExercisesPage).not.toHaveBeenCalled();
  });
  it("preserves completed empty history and does not load active exercise data for it", async () => {
    vi.mocked(getWorkoutHistoryDetail).mockResolvedValue({ entry: { id: "entry", slug: "push-2026-10-12", name: "Old Push", status: "COMPLETED", performedAt: new Date("2026-10-12"), plannedName: null, scheduledDate: null, schedulingIntent: "ROTATION" }, sessions: [], pagination });
    const html = renderToStaticMarkup(await DetailPage({ params: params(), searchParams: searchParams() }));
    expect(html).toContain("Old Push"); expect(html).toContain("No recorded sessions"); expect(html).not.toContain("Finish workout");
    expect(getActiveWorkoutDetail).not.toHaveBeenCalled();
  });
  it("loads active detail by the authenticated owner, log, and requested entry", async () => {
    vi.mocked(getWorkoutHistoryDetail).mockResolvedValue({ entry: { id: "entry", slug: "push-2026-10-12", name: "Push", status: "IN_PROGRESS", performedAt: new Date("2026-10-12"), plannedName: null, scheduledDate: null, schedulingIntent: "ROTATION" }, sessions: [], pagination });
    vi.mocked(getActiveWorkoutDetail).mockResolvedValue({ id: "entry", name: "Push", date: "2026-10-12", exercisePlanRevision: 0, exercises: [], sessions: [] });
    const html = renderToStaticMarkup(await DetailPage({ params: params(), searchParams: searchParams() }));
    expect(html).toContain('href="/logs/strength"');
    expect(getActiveWorkoutDetail).toHaveBeenCalledWith("owner", "owned-log", "entry");
  });
  it("permanently redirects an old ID URL and preserves pagination", async () => {
    vi.mocked(getWorkoutHistoryDetail).mockResolvedValue({ entry: { id: "entry", slug: "push-2026-10-12", name: "Push", status: "COMPLETED", performedAt: new Date("2026-10-12"), plannedName: null, scheduledDate: null, schedulingIntent: "ROTATION" }, sessions: [], pagination });
    await expect(DetailPage({ params: Promise.resolve({ logSlug: "strength", entryId: "entry" }), searchParams: Promise.resolve({ page: "2", limit: "12" }) }))
      .rejects.toThrow("NEXT_PERMANENT_REDIRECT:/logs/strength/workouts/push-2026-10-12?page=2&limit=12");
    expect(getWorkoutHistoryDetail).toHaveBeenCalledWith("owner", "owned-log", "entry", 2, 12);
  });
  it("redirects start options to the owned active entry and offers setup when no routine exists", async () => {
    const html = renderToStaticMarkup(await StartPage({ params: params() }));
    expect(html).toContain('href="/routine/strength"');
    vi.mocked(getWorkoutSelection).mockResolvedValue({ routineId: "routine", revision: 1, nextId: "a", nextName: "A", active: { id: "entry", slug: "a-2026-10-12", name: "A", date: "2026-10-12" } });
    await expect(StartPage({ params: params() })).rejects.toThrow("NEXT_REDIRECT:/logs/strength/workouts/a-2026-10-12");
  });
});
