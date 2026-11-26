import Link from "next/link";
import { VolumeChart } from "@/components/Charts";
import { requireAccess } from "@/lib/auth";
import { buildWeeklyVolume, loadWorkouts, summary, volume } from "@/lib/data";
import { formatDate, formatNumber } from "@/lib/format";
import { isWorkoutType, TYPE_META, WORKOUT_TYPES } from "@/lib/workout-types";

export default async function WorkoutsPage({ searchParams }: { searchParams: Promise<{ typ?: string }> }) {
  const sp = await searchParams;
  const filter = isWorkoutType(sp.typ) ? sp.typ : null;
  const { supabase, profile } = await requireAccess();
  const all = await loadWorkouts(supabase, profile.id, 365);
  const workouts = filter ? all.filter((w) => w.workout_type === filter) : all;
  const weekly = buildWeeklyVolume(all.filter((w) => w.performed_on >= new Date(Date.now() - 84 * 86400000).toISOString().slice(0, 10)));

  const last30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const recent = all.filter((w) => w.performed_on >= last30);
  const counts = WORKOUT_TYPES.map((t) => ({ t, n: recent.filter((w) => w.workout_type === t).length }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <Link href="/workouts/neu" className="btn">+ Neues Workout</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {counts.map(({ t, n }) => (
          <Link key={t} href={`/workouts?typ=${t}`} className="card hover:border-emerald-300">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{TYPE_META[t].emoji} {TYPE_META[t].label}</p>
            <p className="mt-1 text-2xl font-bold">{n}×</p>
            <p className="text-xs text-slate-500">in den letzten 30 Tagen</p>
          </Link>
        ))}
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">Trainingsvolumen pro Woche (Kraft)</h2>
        <VolumeChart data={weekly} />
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href="/workouts" className={`rounded-full border px-3 py-1 text-sm ${!filter ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}>
          Alle
        </Link>
        {WORKOUT_TYPES.map((t) => (
          <Link
            key={t}
            href={`/workouts?typ=${t}`}
            className={`rounded-full border px-3 py-1 text-sm ${filter === t ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}
          >
            {TYPE_META[t].label}
          </Link>
        ))}
      </div>

      {workouts.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-500">Noch keine Workouts eingetragen.</div>
      ) : (
        <ul className="space-y-2">
          {workouts.map((w) => (
            <li key={w.id}>
              <Link href={`/workouts/${w.id}`} className="card flex items-center justify-between gap-4 hover:border-emerald-300">
                <div className="min-w-0">
                  <p className="font-semibold">
                    <span className={`mr-2 rounded border px-1.5 py-0.5 text-xs ${TYPE_META[w.workout_type].badge}`}>{TYPE_META[w.workout_type].label}</span>
                    {w.title !== TYPE_META[w.workout_type].label && w.title}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-500">{summary(w)}</p>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <p className="text-slate-700">{formatDate(w.performed_on)}</p>
                  {w.workout_type !== "cardio" && <p className="text-slate-500">{formatNumber(volume(w), 0)} kg</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
