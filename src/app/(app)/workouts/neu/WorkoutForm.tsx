"use client";

import { useActionState, useState, useTransition } from "react";
import type { Exercise } from "@/lib/data";
import { REPS, SETS, TYPE_META, WORKOUT_TYPES, type WorkoutType } from "@/lib/workout-types";
import { createExercise, createWorkout, deleteOwnExercise, type FormState } from "../actions";

type Strength = { exercise_id: number; sets: number; reps: number; weight_kg: number };
type Cardio = { exercise_id: number; duration_min: number; distance_km: number | null };

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-lg font-bold tabular-nums text-emerald-700">
          {value}
          {unit && <span className="ml-0.5 text-xs font-medium text-slate-500">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-600"
        aria-label={label}
      />
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function WeightInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const step = (d: number) => onChange(Math.max(0, Math.round((value + d) * 4) / 4));
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">Gewicht</span>
      <div className="flex items-center gap-1">
        <button type="button" className="btn-secondary px-2.5" onClick={() => step(-2.5)} aria-label="2,5 kg weniger">−</button>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.25}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          className="input text-center tabular-nums"
          aria-label="Gewicht in kg"
        />
        <button type="button" className="btn-secondary px-2.5" onClick={() => step(2.5)} aria-label="2,5 kg mehr">+</button>
        <span className="text-xs text-slate-500">kg</span>
      </div>
    </div>
  );
}

export default function WorkoutForm({
  exercises: initialExercises,
  date,
  initialType,
  planId,
}: {
  exercises: Exercise[];
  date: string;
  initialType: WorkoutType | null;
  planId: number | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createWorkout, {});
  const [exercises, setExercises] = useState(initialExercises);
  const [type, setType] = useState<WorkoutType | null>(initialType);
  const [strength, setStrength] = useState<Strength[]>([]);
  const [cardio, setCardio] = useState<Cardio[]>([]);
  const [newName, setNewName] = useState("");
  const [exError, setExError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const available = type ? exercises.filter((e) => e.workout_type === type) : [];
  const selectedIds = type === "cardio" ? cardio.map((c) => c.exercise_id) : strength.map((s) => s.exercise_id);
  const nameOf = (id: number) => exercises.find((e) => e.id === id)?.name ?? "";

  const chooseType = (t: WorkoutType) => {
    if (t === type) return;
    setType(t);
    setStrength([]);
    setCardio([]);
  };

  const toggle = (id: number) => {
    if (type === "cardio") {
      setCardio((c) => (c.some((x) => x.exercise_id === id) ? c.filter((x) => x.exercise_id !== id) : [...c, { exercise_id: id, duration_min: 30, distance_km: null }]));
    } else {
      setStrength((s) =>
        s.some((x) => x.exercise_id === id)
          ? s.filter((x) => x.exercise_id !== id)
          : [...s, { exercise_id: id, sets: SETS.default, reps: REPS.default, weight_kg: 0 }],
      );
    }
  };

  const addOwn = () => {
    if (!type || !newName.trim()) return;
    setExError(null);
    startTransition(async () => {
      const res = await createExercise(newName, type);
      if (res.error || !res.exercise) {
        setExError(res.error ?? "Fehler");
        return;
      }
      setExercises((e) => [...e, res.exercise!]);
      setNewName("");
      toggle(res.exercise.id);
    });
  };

  const removeOwn = (id: number) => {
    setExError(null);
    startTransition(async () => {
      const res = await deleteOwnExercise(id);
      if (res.error) {
        setExError(res.error);
        return;
      }
      setExercises((e) => e.filter((x) => x.id !== id));
      setStrength((s) => s.filter((x) => x.exercise_id !== id));
      setCardio((c) => c.filter((x) => x.exercise_id !== id));
    });
  };

  const updateStrength = (id: number, patch: Partial<Strength>) =>
    setStrength((s) => s.map((x) => (x.exercise_id === id ? { ...x, ...patch } : x)));
  const updateCardio = (id: number, patch: Partial<Cardio>) =>
    setCardio((c) => c.map((x) => (x.exercise_id === id ? { ...x, ...patch } : x)));

  const entries = type === "cardio" ? cardio : strength;

  return (
    <form action={action} className="space-y-4">
      <section className="card">
        <h2 className="mb-3 font-semibold">1. Training wählen</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WORKOUT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => chooseType(t)}
              className={`rounded-xl border-2 p-3 text-left transition ${
                type === t ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              aria-pressed={type === t}
            >
              <span className="text-2xl">{TYPE_META[t].emoji}</span>
              <span className="mt-1 block font-semibold">{TYPE_META[t].label}</span>
            </button>
          ))}
        </div>
      </section>

      {type && (
        <section className="card">
          <h2 className="mb-1 font-semibold">2. Übungen anklicken</h2>
          <p className="mb-3 text-xs text-slate-500">Grundübungen und deine eigenen Übungen. Eigene Übungen sind mit ★ markiert.</p>
          <div className="flex flex-wrap gap-2">
            {available.map((e) => {
              const active = selectedIds.includes(e.id);
              return (
                <span key={e.id} className="inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => toggle(e.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400"
                    } ${e.owner_id ? "rounded-r-none" : ""}`}
                    aria-pressed={active}
                  >
                    {active ? "✓ " : "+ "}
                    {e.name}
                    {e.owner_id && " ★"}
                  </button>
                  {e.owner_id && (
                    <button
                      type="button"
                      onClick={() => removeOwn(e.id)}
                      className="rounded-r-full border border-l-0 border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-400 hover:text-red-600"
                      aria-label={`Eigene Übung ${e.name} löschen`}
                      title="Eigene Übung löschen"
                      disabled={busy}
                    >
                      ✕
                    </button>
                  )}
                </span>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              className="input"
              placeholder="Eigene Übung hinzufügen …"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOwn();
                }
              }}
              aria-label="Name der eigenen Übung"
            />
            <button type="button" className="btn-secondary shrink-0" onClick={addOwn} disabled={busy || !newName.trim()}>
              Hinzufügen
            </button>
          </div>
          {exError && <p className="mt-2 text-sm text-red-700">{exError}</p>}
        </section>
      )}

      {type && entries.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-semibold">3. Einstellen</h2>
          <div className="space-y-3">
            {type !== "cardio" &&
              strength.map((s) => (
                <div key={s.exercise_id} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold">{nameOf(s.exercise_id)}</p>
                    <button type="button" className="btn-danger" onClick={() => toggle(s.exercise_id)} aria-label="Übung entfernen">✕</button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Slider label="Sätze" value={s.sets} min={SETS.min} max={SETS.max} onChange={(v) => updateStrength(s.exercise_id, { sets: v })} />
                    <Slider label="Wiederholungen" value={s.reps} min={REPS.min} max={REPS.max} onChange={(v) => updateStrength(s.exercise_id, { reps: v })} />
                    <WeightInput value={s.weight_kg} onChange={(v) => updateStrength(s.exercise_id, { weight_kg: v })} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {s.sets} × {s.reps} Wdh.{s.weight_kg > 0 && ` mit ${s.weight_kg.toLocaleString("de-DE")} kg`}
                  </p>
                </div>
              ))}
            {type === "cardio" &&
              cardio.map((c) => (
                <div key={c.exercise_id} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold">{nameOf(c.exercise_id)}</p>
                    <button type="button" className="btn-danger" onClick={() => toggle(c.exercise_id)} aria-label="Übung entfernen">✕</button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Slider label="Dauer" unit="min" value={c.duration_min} min={5} max={180} onChange={(v) => updateCardio(c.exercise_id, { duration_min: v })} />
                    <div>
                      <span className="mb-1 block text-xs font-medium text-slate-600">Distanz (optional)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.1}
                          value={c.distance_km ?? ""}
                          onChange={(e) => updateCardio(c.exercise_id, { distance_km: e.target.value === "" ? null : Number(e.target.value) })}
                          className="input tabular-nums"
                          aria-label="Distanz in km"
                        />
                        <span className="text-xs text-slate-500">km</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {type && (
        <section className="card grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="performed_on">Datum</label>
            <input className="input" id="performed_on" name="performed_on" type="date" defaultValue={date} required />
          </div>
          <div>
            <label className="label" htmlFor="title">Titel</label>
            <input className="input" id="title" name="title" placeholder={TYPE_META[type].label} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="notes">Notizen</label>
            <textarea className="input" id="notes" name="notes" rows={2} />
          </div>
        </section>
      )}

      <input type="hidden" name="workout_type" value={type ?? ""} />
      <input type="hidden" name="entries" value={JSON.stringify(entries)} />
      {planId && <input type="hidden" name="plan_id" value={planId} />}
      {state.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{state.error}</p>}
      {type && (
        <button className="btn w-full sm:w-auto" disabled={pending || entries.length === 0}>
          {pending ? "Speichern …" : "Workout speichern"}
        </button>
      )}
    </form>
  );
}
