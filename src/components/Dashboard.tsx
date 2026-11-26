import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { VolumeChart, WeightChart } from "@/components/Charts";
import { bmiClass, calcBmi } from "@/lib/bmi";
import { buildWeeklyVolume, loadWeights, loadWorkouts, summary, type PlannedWorkout } from "@/lib/data";
import { formatDate, formatNumber, today } from "@/lib/format";
import { TYPE_META, WORKOUT_TYPES } from "@/lib/workout-types";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** Übersicht über die Daten eines Nutzers (für den Admin-Bereich). */
export default async function Dashboard({
  supabase,
  userId,
  heightCm,
}: {
  supabase: SupabaseClient;
  userId: string;
  heightCm: number | null;
}) {
  const [workouts, weights, plans] = await Promise.all([
    loadWorkouts(supabase, userId),
    loadWeights(supabase, userId),
    supabase
      .from("planned_workouts")
      .select("*")
      .eq("user_id", userId)
      .gte("planned_on", today())
      .is("completed_workout_id", null)
      .order("planned_on")
      .limit(8)
      .returns<PlannedWorkout[]>(),
  ]);
  const weekly = buildWeeklyVolume(workouts);
  const last30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const recent30 = workouts.filter((w) => w.performed_on >= last30);
  const current = weights.at(-1);
  const bmi = current && heightCm ? calcBmi(Number(current.weight_kg), heightCm) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Workouts (30 Tage)"
          value={String(recent30.length)}
          hint={WORKOUT_TYPES.map((t) => `${recent30.filter((w) => w.workout_type === t).length}× ${TYPE_META[t].label}`).join(" · ")}
        />
        <Stat label="Geplant" value={String(plans.data?.length ?? 0)} hint="offene Trainings ab heute" />
        <Stat label="Aktuelles Gewicht" value={current ? `${formatNumber(Number(current.weight_kg))} kg` : "–"} />
        <Stat label="BMI" value={bmi ? formatNumber(bmi) : "–"} hint={bmi ? bmiClass(bmi).label : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold">Körpergewicht</h2>
          <WeightChart data={weights.slice(-40)} />
        </section>
        <section className="card">
          <h2 className="mb-3 font-semibold">Trainingsvolumen pro Woche</h2>
          <VolumeChart data={weekly} />
        </section>
        <section className="card">
          <h2 className="mb-3 font-semibold">Letzte Workouts</h2>
          {workouts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Noch keine Workouts</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {workouts.slice(0, 8).map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{w.title}</p>
                    <p className="truncate text-xs text-slate-500">{summary(w)}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{formatDate(w.performed_on)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="mb-3 font-semibold">Nächste geplante Trainings</h2>
          {(plans.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Nichts geplant</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(plans.data ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full ${TYPE_META[p.workout_type].dot}`} />
                    {p.title}
                  </span>
                  <span className="text-xs text-slate-500">{formatDate(p.planned_on)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="text-xs text-slate-400">
        Nur-Lese-Ansicht. <Link href="/admin" className="underline">Zurück zum Admin-Bereich</Link>
      </p>
    </div>
  );
}
