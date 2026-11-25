import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { WORKOUT_SELECT, volume, type Workout } from "@/lib/data";
import { formatDate, formatNumber } from "@/lib/format";
import { deleteWorkout } from "../actions";

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireAccess();
  const { data: w } = await supabase
    .from("workouts")
    .select(WORKOUT_SELECT)
    .eq("id", Number(id))
    .eq("user_id", profile.id)
    .maybeSingle<Workout>();
  if (!w) notFound();

  const groups = new Map<string, Workout["workout_sets"]>();
  for (const s of [...w.workout_sets].sort((a, b) => a.id - b.id)) {
    const name = s.exercise?.name ?? "Unbekannt";
    groups.set(name, [...(groups.get(name) ?? []), s]);
  }

  return (
    <div className="space-y-4">
      <Link href="/workouts" className="text-sm text-emerald-700 hover:underline">← Alle Workouts</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{w.title}</h1>
          <p className="text-sm text-slate-500">
            {formatDate(w.performed_on)} · {w.workout_sets.length} Sätze · {formatNumber(volume(w), 0)} kg Volumen
          </p>
        </div>
        <form action={deleteWorkout}>
          <input type="hidden" name="id" value={w.id} />
          <button className="btn-danger border border-red-200">Workout löschen</button>
        </form>
      </div>
      {w.notes && <p className="card text-sm text-slate-700">{w.notes}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {[...groups.entries()].map(([name, sets]) => (
          <section key={name} className="card">
            <h2 className="mb-2 font-semibold">{name}</h2>
            <table className="table">
              <thead>
                <tr><th>Satz</th><th>Wdh.</th><th>Gewicht</th></tr>
              </thead>
              <tbody>
                {sets.map((s) => (
                  <tr key={s.id}>
                    <td>{s.set_number}</td>
                    <td>{s.reps}</td>
                    <td>{formatNumber(Number(s.weight_kg), 2)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}
