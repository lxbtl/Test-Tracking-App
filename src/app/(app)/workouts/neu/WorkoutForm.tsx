"use client";

import { useActionState, useState } from "react";
import { createWorkout, type FormState } from "../actions";

type Exercise = { id: number; name: string; muscle_group: string | null };
type Row = { key: number; exercise_id: number; reps: number; weight_kg: number };

let nextKey = 1;

export default function WorkoutForm({ exercises, today }: { exercises: Exercise[]; today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createWorkout, {});
  const [rows, setRows] = useState<Row[]>([
    { key: nextKey++, exercise_id: exercises[0]?.id ?? 0, reps: 10, weight_kg: 20 },
  ]);

  const update = (key: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const addRow = () =>
    setRows((r) => {
      const last = r.at(-1);
      return [...r, { key: nextKey++, exercise_id: last?.exercise_id ?? exercises[0]?.id ?? 0, reps: last?.reps ?? 10, weight_kg: last?.weight_kg ?? 0 }];
    });
  const removeRow = (key: number) => setRows((r) => r.filter((row) => row.key !== key));

  return (
    <form action={action} className="card space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">Titel</label>
          <input className="input" id="title" name="title" placeholder="z. B. Push-Tag" required />
        </div>
        <div>
          <label className="label" htmlFor="performed_on">Datum</label>
          <input className="input" id="performed_on" name="performed_on" type="date" defaultValue={today} required />
        </div>
      </div>

      <div>
        <p className="label">Sätze</p>
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_6rem_7rem_2.5rem] gap-2 text-xs font-medium text-slate-500 sm:grid">
            <span>Übung</span>
            <span>Wdh.</span>
            <span>Gewicht (kg)</span>
            <span />
          </div>
          {rows.map((row) => (
            <div key={row.key} className="grid grid-cols-[1fr_4.5rem_5.5rem_2.5rem] gap-2 sm:grid-cols-[1fr_6rem_7rem_2.5rem]">
              <select
                className="input"
                value={row.exercise_id}
                onChange={(e) => update(row.key, { exercise_id: Number(e.target.value) })}
                aria-label="Übung"
              >
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
              <input
                className="input"
                type="number"
                min={1}
                value={row.reps}
                onChange={(e) => update(row.key, { reps: Number(e.target.value) })}
                aria-label="Wiederholungen"
              />
              <input
                className="input"
                type="number"
                min={0}
                step={0.25}
                value={row.weight_kg}
                onChange={(e) => update(row.key, { weight_kg: Number(e.target.value) })}
                aria-label="Gewicht in kg"
              />
              <button type="button" className="btn-danger" onClick={() => removeRow(row.key)} aria-label="Satz entfernen" disabled={rows.length === 1}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-secondary mt-3" onClick={addRow}>+ Satz hinzufügen</button>
      </div>

      <div>
        <label className="label" htmlFor="notes">Notizen</label>
        <textarea className="input" id="notes" name="notes" rows={2} />
      </div>

      <input type="hidden" name="sets" value={JSON.stringify(rows)} />
      {state.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Speichern …" : "Workout speichern"}</button>
    </form>
  );
}
