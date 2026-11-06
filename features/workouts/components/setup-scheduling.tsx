"use client";

import { FormTextField } from "@/components/form-text-field";
import type { SetupDraft } from "../setup-draft";
import { ScheduleStyleOptions } from "./schedule-style-options";
export const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function SetupScheduling({ draft, onChange, today, disabled }: {
  draft: SetupDraft; onChange: (changes: Partial<SetupDraft>) => void; today: string; disabled: boolean;
}) {
  return <div className="form-stack schedule-settings">
    <ScheduleStyleOptions name="setupStyle" value={draft.style} disabled={disabled} onChange={(style) => onChange({ style })} />
    {draft.style === "CONTINUOUS" ? <label className="field">Next workout<select value={draft.nextId} required disabled={disabled} onChange={(event) => onChange({ nextId: event.target.value })}><option value="">Choose next workout</option>{draft.workouts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
    {draft.style === "FIXED" ? <fieldset className="form-stack"><legend>Weekday assignments</legend>{weekdayNames.map((name, weekday) => <label className="field" key={name}>{name}<select value={draft.assignments.find((item) => item.weekday === weekday)?.definitionId ?? ""} disabled={disabled} onChange={(event) => onChange({ assignments: [...draft.assignments.filter((item) => item.weekday !== weekday), ...(event.target.value ? [{ weekday, definitionId: event.target.value }] : [])] })}><option value="">Rest day</option>{draft.workouts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>)}</fieldset> : null}
    {draft.style !== "CONTINUOUS" ? (
      <label className="field">
        Week begins on
        <select value={draft.weekStart} disabled={disabled} onChange={(event) => onChange({ weekStart: Number(event.target.value) })}>
          {weekdayNames.map((name, index) => <option key={name} value={index}>{name}</option>)}
        </select>
      </label>
    ) : null}
    <FormTextField
      id="routine-timezone"
      label="Timezone"
      value={draft.timezone}
      maxLength={100}
      required
      disabled={disabled}
      onChange={(event) => onChange({ timezone: event.target.value })}
    />
    <p>Starts today: {today || "Choose a valid timezone"} · {draft.timezone}</p>
  </div>;
}
