import Link from "next/link";
import { requireAccess } from "@/lib/auth";
import { WORKOUT_SELECT, volume, type Workout } from "@/lib/data";
import { formatDate, formatNumber } from "@/lib/format";

export default async function WorkoutsPage() {
  const { supabase, profile } = await requireAccess();
  const { data } = await supabase
    .from("workouts")
    .select(WORKOUT_SELECT)
    .eq("user_id", profile.id)
    .order("performed_on", { ascending: false })
    .limit(100)
    .returns<Workout[]>();
  const workouts = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <Link href="/workouts/neu" className="btn">+ Neues Workout</Link>
      </div>
      {workouts.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-500">Noch keine Workouts eingetragen.</div>
      ) : (
        <ul className="space-y-2">
          {workouts.map((w) => {
            const exercises = [...new Set(w.workout_sets.map((s) => s.exercise?.name).filter(Boolean))];
            return (
              <li key={w.id}>
                <Link href={`/workouts/${w.id}`} className="card flex items-center justify-between gap-4 hover:border-emerald-300">
                  <div className="min-w-0">
                    <p className="font-semibold">{w.title}</p>
                    <p className="truncate text-sm text-slate-500">{exercises.join(", ")}</p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="text-slate-700">{formatDate(w.performed_on)}</p>
                    <p className="text-slate-500">
                      {w.workout_sets.length} Sätze · {formatNumber(volume(w), 0)} kg
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
