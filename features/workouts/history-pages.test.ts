import { vi } from "vitest";
import HistoryPage from "@/app/(app)/logs/[logSlug]/workouts/page";
import DetailPage from "@/app/(app)/logs/[logSlug]/workouts/[entryId]/page";
import GroupPage from "@/app/(app)/logs/[logSlug]/workouts/new/page";
import { requireUser } from "@/lib/auth";
import { getLogBySlug } from "@/features/logs/queries";
import { getHistoryRoutine, getStandaloneSessionPage, getWorkoutHistoryDetail, getWorkoutHistoryPage } from "./history-queries";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/features/logs/queries", () => ({ getLogBySlug: vi.fn() }));
vi.mock("@/features/workouts/history-queries", () => ({ getHistoryRoutine: vi.fn(), getStandaloneSessionPage: vi.fn(), getWorkoutHistoryDetail: vi.fn(), getWorkoutHistoryPage: vi.fn() }));
vi.mock("@/features/workouts/components/history-forms", () => ({ HistoricalGroupForm: () => null }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));

const params = () => Promise.resolve({ logSlug: "strength", entryId: "entry" });
const searchParams = () => Promise.resolve({});

describe("workout history page boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: "user-a", role: "USER", isDemo: false, demoExpiresAt: null });
    const timestamp = new Date("2026-11-02");
    vi.mocked(getLogBySlug).mockResolvedValue({ id: "owned-log", userId: "user-a", title: "Strength", slug: "strength", createdAt: timestamp, updatedAt: timestamp });
    vi.mocked(getHistoryRoutine).mockResolvedValue(null);
  });

  it("blocks all history reads for foreign or missing logs", async () => {
    vi.mocked(getLogBySlug).mockResolvedValue(null);
    await expect(HistoryPage({ params: params(), searchParams: searchParams() })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(DetailPage({ params: params(), searchParams: searchParams() })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(GroupPage({ params: params(), searchParams: searchParams() })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getWorkoutHistoryPage).not.toHaveBeenCalled(); expect(getWorkoutHistoryDetail).not.toHaveBeenCalled(); expect(getHistoryRoutine).not.toHaveBeenCalled();
  });

  it("scopes entry details by authenticated owner and resolved log", async () => {
    vi.mocked(getWorkoutHistoryDetail).mockResolvedValue(null);
    await expect(DetailPage({ params: params(), searchParams: searchParams() })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getLogBySlug).toHaveBeenCalledWith({ userId: "user-a", slug: "strength" });
    expect(getWorkoutHistoryDetail).toHaveBeenCalledWith("user-a", "owned-log", "entry", 1, 12);
  });

  it("does not query standalone sessions for malformed dates or absent routines", async () => {
    await expect(GroupPage({ params: params(), searchParams: Promise.resolve({ performedDate: "2026-02-31" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    await GroupPage({ params: params(), searchParams: Promise.resolve({ performedDate: "2026-11-01" }) });
    expect(getHistoryRoutine).toHaveBeenCalledWith("user-a", "owned-log");
    expect(getStandaloneSessionPage).not.toHaveBeenCalled();
  });
});
