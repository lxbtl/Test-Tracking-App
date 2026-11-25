"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveWeight, type FormState } from "./actions";

export default function WeightForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveWeight, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="card grid gap-4 sm:grid-cols-3">
      <div>
        <label className="label" htmlFor="measured_on">Datum</label>
        <input className="input" id="measured_on" name="measured_on" type="date" defaultValue={today} required />
      </div>
      <div>
        <label className="label" htmlFor="weight_kg">Gewicht (kg)</label>
        <input className="input" id="weight_kg" name="weight_kg" type="number" step={0.1} min={1} required />
      </div>
      <div className="flex items-end">
        <button className="btn w-full" disabled={pending}>Speichern</button>
      </div>
      <p className="text-xs text-slate-500 sm:col-span-3">Pro Tag ein Wert. Ein neuer Eintrag am selben Tag überschreibt den alten.</p>
      {state.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700 sm:col-span-3">{state.error}</p>}
    </form>
  );
}
