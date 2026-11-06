import { vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkoutSummary } from "./components/workout-summary";
import { ActiveWorkout } from "./components/active-workout";
import { EntryExercisePicker } from "./components/entry-exercise-picker";
import { WeightliftingSessionForm } from "@/features/weightlifting/components/weightlifting-session-form";
import type { getWorkoutSummary, getActiveWorkoutDetail } from "./queries";

// These assertions exercise rendered controls/links; mutation and lifecycle
// behavior is covered separately through the real Server Actions.
vi.mock("./view-actions", () => ({ startWorkoutFromViewAction: vi.fn(), endWorkoutFromViewAction: vi.fn() }));
vi.mock("./entry-exercise-actions", () => ({ changeEntryExerciseAction: vi.fn() }));
vi.mock("./setup-actions", () => ({ searchRoutineExercisesAction: vi.fn() }));
type Summary = NonNullable<Awaited<ReturnType<typeof getWorkoutSummary>>>;
function summary(): Summary {
  return { id: "routine", name: "Split", revision: 1, nextId: "a", nextName: "Push", active: null,
    schedule: { id: "schedule", style: "CONTINUOUS", timezone: "Europe/Chisinau", weekStart: 1, today: "2026-11-05", next: null,
      nextDate: null, nextDateTimezone: null, choices: [], assignments: [], pending: null, nextWeekDate: "2026-11-09" } };
}
const renderSummary = (routine: Summary | null) => renderToStaticMarkup(createElement(WorkoutSummary, { logId: "log", logSlug: "strength", routine, requestId: "request" }));
describe("dedicated workout presentation", () => {
  it("locks the workout and date fields on session forms opened from the workout", () => {
    const linkedWorkout = { id: "entry", name: "Push", date: "2026-10-12" };
    const props = { action: async () => ({}), submitLabel: "Save session", defaultPerformedDate: linkedWorkout.date };
    const workout = { routineId: "routine", revision: 1, nextId: "push", nextName: "Push", active: { ...linkedWorkout, slug: "push-2026-10-12" } };
    for (const context of [{ workout }, { sessionId: "session", linkedWorkout }]) {
      const locked = renderToStaticMarkup(createElement(WeightliftingSessionForm, { ...props, ...context, returnWorkoutEntryId: linkedWorkout.id }));
      expect(locked).not.toContain('<select id="workoutSelection"');
      expect(locked).toContain('name="workoutSelection" value="entry"');
      expect(locked).toMatch(/<input\b(?=[^>]*\bid="performedDate")(?=[^>]*\breadonly="")[^>]*>/i);
      const ordinary = renderToStaticMarkup(createElement(WeightliftingSessionForm, { ...props, ...context }));
      expect(ordinary).toContain('<select id="workoutSelection"');
    }
  });
  it("keeps daily pickers explicit, cancellable, and limited to existing exercises", () => {
    for (const change of [{ operation: "add" } as const, { operation: "replace", originalExerciseId: "squat" } as const]) {
      const html = renderToStaticMarkup(createElement(EntryExercisePicker, { logId: "log", entryId: "entry", intent: { requestId: "request", expectedRevision: null, change }, plannedIds: ["squat"], onClose: vi.fn() }));
      expect(html).not.toContain("Changes apply only to this workout.");
      expect(html).toContain('class="progress-heading"');
      expect(html).not.toContain("Search");
      expect(html).toMatch(/type="button"[^>]*>Cancel<\/button>/);
      expect(html).toMatch(/disabled=""[^>]*>(Add exercise|Replace exercise)<\/button>/);
      expect(html).not.toContain("Create a missing exercise"); expect(html).not.toContain("Move up");
    }
  });
  it("leaves logs without routines alone and keeps idle controls compact", () => {
    expect(renderSummary(null)).toBe("");
    const html = renderSummary(summary());
    expect(html).toContain("<h2>Next workout: Push</h2><p>Split</p>"); expect(html).toContain(">Start</button>");
    expect(html).not.toContain("Workout options");
    expect(html).not.toContain("<select"); expect(html).not.toContain('type="date"');
    expect(html).not.toContain("Reset"); expect(html).not.toContain("Discard");
  });
  it("shows the active workout and routine name without a session count", () => {
    const routine = summary(); routine.active = { id: "entry", slug: "push-2026-11-05", name: "Push", _count: { sessions: 2 } };
    const html = renderSummary(routine);
    expect(html).toContain("<h2>Current workout: Push</h2><p>Split</p>"); expect(html).not.toContain("sessions recorded");
    expect(html).toContain('href="/logs/strength/workouts/push-2026-11-05"'); expect(html).toContain("Continue");
    expect(html).not.toContain("<form");
  });
  it("offers the start-options route on rest days and after weekly exhaustion", () => {
    const routine = summary(); routine.schedule!.style = "FIXED"; routine.schedule!.nextDate = "2026-11-06"; routine.schedule!.nextDateTimezone = "Europe/Chisinau";
    let html = renderSummary(routine);
    expect(html).toContain("<h2>Rest day</h2><p>Split</p>"); expect(html).toContain('href="/logs/strength/workouts/start"');
    routine.schedule!.style = "WEEKLY";
    html = renderSummary(routine); expect(html).toContain("Week complete"); expect(html).not.toContain(">Start</button>");
  });
  it("renders shortcuts, saved-session links, other sessions, and empty Finish protection", () => {
    const exercise = { id: "squat", title: "Squat", slug: "squat" };
    const entry: NonNullable<Awaited<ReturnType<typeof getActiveWorkoutDetail>>> = { id: "entry", name: "A", date: "2026-10-12", exercisePlanRevision: 0, exercises: [{ id: "planned", exercise }], sessions: [] };
    const render = () => renderToStaticMarkup(createElement(ActiveWorkout, { logId: "log", logSlug: "strength", entry }));
    let html = render();
    expect(html).toContain('workoutEntryId=entry'); expect(html).toContain("Not recorded yet");
    expect(html).toContain(">Add session</a>");
    expect(html).toMatch(/disabled=""[^>]*>Finish workout/);
    expect(html).toContain("<h2>Delete workout</h2>");
    expect(html).not.toContain("<summary>");
    entry.sessions = [{ id: "session", exercise }, { id: "other", exercise: { id: "row", title: "Row", slug: "row" } }];
    html = render();
    expect(html).toContain("<p>Recorded</p>"); expect(html).toContain("Edit session"); expect(html).toContain("Other recorded sessions");
    expect(html).toContain('href="/logs/strength/exercises/squat/weightlifting/session/edit?workoutEntryId=entry"');
    expect(html).not.toContain("View session 1"); expect(html).toContain('/weightlifting/other');
    expect(html).toContain(">Add exercise</button>"); expect(html).toContain('aria-label="Replace Squat"'); expect(html).not.toContain("Choose another exercise"); expect(html).not.toContain("Workout history");
    expect(html).not.toMatch(/disabled=""[^>]*>Finish workout/);
    entry.sessions.push({ id: "second", exercise });
    html = render();
    expect(html).toContain('/weightlifting/session/edit?workoutEntryId=entry">Edit session 1');
    expect(html).toContain('/weightlifting/second/edit?workoutEntryId=entry">Edit session 2');
  });
});
