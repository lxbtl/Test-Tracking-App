"use client";

import { useActionState, useEffect, useRef } from "react";
import { TYPE_META, WORKOUT_TYPES } from "@/lib/workout-types";
import { addPlan, type PlanState } from "./actions";

export default function PlanForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState<PlanState, FormData>(addPlan, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="card space-y-3">
      <h2 className="font-semibold">Training einplanen</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="planned_on">Datum</label>
          <input className="input" id="planned_on" name="planned_on" type="date" defaultValue={defaultDate} key={defaultDate} required />
        </div>
        <div>
          <label className="label" htmlFor="workout_type">Training</label>
          <select className="input" id="workout_type" name="workout_type" defaultValue="push">
            {WORKOUT_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_META[t].emoji} {TYPE_META[t].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="repeat_weeks">Wiederholen</label>
          <select className="input" id="repeat_weeks" name="repeat_weeks" defaultValue="1">
            <option value="1">Nur einmal</option>
            <option value="4">4 Wochen lang wöchentlich</option>
            <option value="8">8 Wochen lang wöchentlich</option>
            <option value="12">12 Wochen lang wöchentlich</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="notes">Notiz</label>
          <input className="input" id="notes" name="notes" placeholder="optional" />
        </div>
      </div>
      {state.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{state.error}</p>}
      <button className="btn" disabled={pending}>Einplanen</button>
    </form>
  );
}
