"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { FormFooter } from "@/components/form-footer";
import { FormTextField } from "@/components/form-text-field";
import { SubmitButton } from "@/components/submit-button";
import { workoutAction } from "../actions";
import type { WorkoutActionState } from "../schema";
import type { ScheduleContext } from "../schedule-queries";
import { addDays, localDate, weekOf } from "../calendar";
import { ScheduleStyleOptions } from "./schedule-style-options";
import { RoutineEditSteps } from "./routine-edit-sections";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const subscribe = () => () => {};
export function ScheduleSettings({ logId, routineId, revision, definitions, schedule, cancelHref }: {
  logId: string; routineId: string; revision: number; definitions: { id: string; name: string }[]; schedule: ScheduleContext | null;
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(workoutAction, {} as WorkoutActionState);
  const [style, setStyle] = useState(schedule?.style ?? "CONTINUOUS");
  const detectedZone = useSyncExternalStore(subscribe, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => "UTC");
  const [chosenZone, setTimezone] = useState(schedule?.id ? schedule.timezone : "");
  const timezone = chosenZone || detectedZone;
  const [first, setFirst] = useState(schedule?.weekStart ?? 1);
  const [effective, setEffective] = useState("today");
  const [assignments, setAssignments] = useState(schedule?.assignments ?? []);
  const today = useSyncExternalStore(subscribe, () => {
    try { return localDate(new Date(), schedule?.id ? schedule.timezone : timezone); } catch { return ""; }
  }, () => schedule?.today ?? "");
  const preview = today ? effective === "today" ? today : addDays(weekOf(today, schedule?.id ? schedule.weekStart : first), 7) : "Choose a valid timezone";
  return <>
    <form action={action}>
      <div className="form-stack form-panel schedule-settings workout-panel">
        <RoutineEditSteps />
    {schedule?.pending ? <p>Pending: {schedule.pending.style === "WEEKLY" ? "Weekly sequence" : schedule.pending.style === "FIXED" ? "Fixed weekdays" : "Continuous rotation"} from {schedule.pending.date} ({schedule.pending.timezone}). Saving replaces this pending change.</p> : null}
      <input type="hidden" name="operation" value="saveSchedule" /><input type="hidden" name="logId" value={logId} />
      <input type="hidden" name="routineId" value={routineId} /><input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="expectedScheduleId" value={schedule?.id ?? ""} /><input type="hidden" name="expectedToday" value={schedule?.today ?? ""} />
      <input type="hidden" name="assignments" value={JSON.stringify(assignments)} />
      <ScheduleStyleOptions name="style" value={style} onChange={setStyle} />
      {style === "FIXED" ? <fieldset className="form-stack"><legend>Weekday assignments</legend>{weekdays.map((day, weekday) => <label className="field" key={day}>{day}<select value={assignments.find((item) => item.weekday === weekday)?.definitionId ?? ""} onChange={(event) => setAssignments((current) => [...current.filter((item) => item.weekday !== weekday), ...(event.target.value ? [{ weekday, definitionId: event.target.value }] : [])])}>
        <option value="">Rest day</option>{definitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>)}</fieldset> : null}
      {style !== "CONTINUOUS" ? <label className="field">Week begins on<select name="weekStart" value={first} onChange={(event) => setFirst(Number(event.target.value))}>{weekdays.map((day, index) => <option value={index} key={day}>{day}</option>)}</select></label> : <input type="hidden" name="weekStart" value={first} />}
      <FormTextField
        id="edit-routine-timezone"
        label="Timezone"
        name="timezone"
        value={timezone}
        onChange={(event) => setTimezone(event.target.value)}
        maxLength={100}
        required
        placeholder="Europe/Chisinau"
        help="Use an IANA timezone, for example Europe/Chisinau or America/New_York."
      />
      <label className="field">Apply changes<select name="effective" value={effective} onChange={(event) => setEffective(event.target.value)}><option value="today">Today</option><option value="nextWeek">Next week</option></select></label>
      <p>Effective date: {preview} ({schedule?.id ? schedule.timezone : timezone}). A new weekly list starts from its first workout; earlier outcomes stay in history.</p>
      <label className="checkbox-row"><input type="checkbox" name="confirmed" value="yes" required />Confirm this schedule and effective date.</label>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.success ? <p role="status">{state.success}</p> : null}
      </div>
      <FormFooter cancel={{ href: cancelHref }}>
        <SubmitButton className="button" pendingLabel="Saving…" disabled={pending}>Save schedule</SubmitButton>
      </FormFooter>
    </form>
    {schedule?.pending ? <form action={action} className="form-footer">
      <input type="hidden" name="operation" value="cancelSchedule" /><input type="hidden" name="logId" value={logId} /><input type="hidden" name="routineId" value={routineId} /><input type="hidden" name="revision" value={revision} />
      <button className="text-button danger-text" disabled={pending}>Cancel pending change</button>
    </form> : null}
  </>;
}
