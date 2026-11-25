"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCardio, type FormState } from "./actions";

const ACTIVITIES = ["Laufen", "Radfahren", "Schwimmen", "Rudern", "Gehen", "Crosstrainer", "Sonstiges"];

export default function CardioForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createCardio, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label className="label" htmlFor="activity">Aktivität</label>
        <select className="input" id="activity" name="activity" defaultValue="Laufen">
          {ACTIVITIES.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="performed_on">Datum</label>
        <input className="input" id="performed_on" name="performed_on" type="date" defaultValue={today} required />
      </div>
      <div>
        <label className="label" htmlFor="distance_km">Distanz (km)</label>
        <input className="input" id="distance_km" name="distance_km" type="number" min={0} step={0.1} placeholder="optional" />
      </div>
      <div>
        <label className="label" htmlFor="duration_min">Dauer (min)</label>
        <input className="input" id="duration_min" name="duration_min" type="number" min={1} required />
      </div>
      <div className="flex items-end">
        <button className="btn w-full" disabled={pending}>Speichern</button>
      </div>
      <div className="sm:col-span-2 lg:col-span-5">
        <label className="label" htmlFor="notes">Notizen</label>
        <input className="input" id="notes" name="notes" placeholder="optional" />
      </div>
      {state.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700 sm:col-span-2 lg:col-span-5">{state.error}</p>}
    </form>
  );
}
