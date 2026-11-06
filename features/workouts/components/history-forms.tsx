"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { groupHistoricalWorkoutAction, reassignWorkoutAction } from "../history-actions";
import type { WorkoutActionState } from "../schema";

const initial: WorkoutActionState = {};

export function HistoricalGroupForm({ logId, logSlug, routine, date, requestId, sessions, slots = [] }: {
  logId: string; logSlug: string; date: string; requestId: string;
  routine: { id: string; revision: number; definitions: { id: string; name: string }[] };
  sessions: { id: string; exercise: { title: string; slug: string }; _count: { sets: number } }[];
  slots?: { scheduleId: string; key: string; name: string; date: string; outcome: string }[];
}) {
  const [state, action, pending] = useActionState(groupHistoricalWorkoutAction, initial);
  const [slot, setSlot] = useState("");
  const chosenSlot = slots.find((item) => `${item.scheduleId}|${item.key}` === slot);
  return <form action={action} className="form-stack form-panel" aria-busy={pending}>
    <input type="hidden" name="logId" value={logId} />
    <input type="hidden" name="routineId" value={routine.id} />
    <input type="hidden" name="revision" value={routine.revision} />
    <input type="hidden" name="performedDate" value={date} />
    <input type="hidden" name="requestId" value={requestId} />
    <input type="hidden" name="scheduleId" value={chosenSlot?.scheduleId ?? ""} /><input type="hidden" name="slotKey" value={chosenSlot?.key ?? ""} />
    <label className="field">Fulfill a scheduled slot (optional)<select value={slot} onChange={(event) => setSlot(event.target.value)}><option value="">Independent historical workout</option>{slots.map((item) => <option key={`${item.scheduleId}|${item.key}`} value={`${item.scheduleId}|${item.key}`}>{item.name} · {item.date} · {item.outcome.toLowerCase()}</option>)}</select></label>
    <label className="field">Workout<select name="definitionId" defaultValue="" required>
      <option value="" disabled>Choose a workout</option>
      {routine.definitions.map((definition) => <option value={definition.id} key={definition.id}>{definition.name}</option>)}
    </select></label>
    <fieldset className="field">
      <legend>Standalone sessions on {date}</legend>
      {sessions.map((session) => <div key={session.id}>
        <label className="checkbox-row"><input type="checkbox" name="sessionIds" value={session.id} disabled={pending} />{session.exercise.title} · {session._count.sets} sets</label>
        <Link href={`/logs/${logSlug}/exercises/${session.exercise.slug}/weightlifting/${session.id}`}>View session</Link>
      </div>)}
    </fieldset>
    <p>This creates a completed workout without changing its configured exercises. Only an explicitly selected scheduled slot is fulfilled.</p>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <div className="form-actions"><button className="button" disabled={pending || !sessions.length}>{pending ? "Grouping…" : "Group selected sessions"}</button></div>
  </form>;
}

export function ReassignWorkoutForm({ logId, logSlug, routineId, session, candidates }: {
  logId: string; logSlug: string; routineId: string;
  session: { id: string; updatedAt: string; current: { id: string; name: string } | null };
  candidates: { id: string; slug: string; name: string; status: string }[];
}) {
  const [state, action, pending] = useActionState(reassignWorkoutAction, initial);
  return <form action={action} className="form-stack" aria-busy={pending}>
    <input type="hidden" name="logId" value={logId} />
    <input type="hidden" name="routineId" value={routineId} />
    <input type="hidden" name="sessionId" value={session.id} />
    <input type="hidden" name="expectedEntryId" value={session.current?.id ?? ""} />
    <input type="hidden" name="expectedUpdatedAt" value={session.updatedAt} />
    <fieldset className="field">
      <legend>Assign this session to</legend>
      <label className="radio-row"><input type="radio" name="targetEntryId" value="" defaultChecked={!session.current} required disabled={pending} />Standalone</label>
      {session.current ? <label className="radio-row"><input type="radio" name="targetEntryId" value={session.current.id} defaultChecked required disabled={pending} />{session.current.name} · Current workout</label> : null}
      {candidates.map((entry) => <div key={entry.id}>
        <label className="radio-row"><input type="radio" name="targetEntryId" value={entry.id} required disabled={pending} />
          {entry.name} · {entry.status === "IN_PROGRESS" ? "In progress" : "Completed"}
        </label>
        <Link href={`/logs/${logSlug}/workouts/${entry.slug}`}>View workout</Link>
      </div>)}
    </fieldset>
    <p>Only workouts on this session’s date are offered. Its date, sets, and training metrics stay the same.</p>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <div className="form-actions"><button className="button" disabled={pending}>{pending ? "Saving…" : "Save workout assignment"}</button></div>
  </form>;
}
