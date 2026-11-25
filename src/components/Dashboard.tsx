import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CardioChart, VolumeChart, WeightChart } from "@/components/Charts";
import { buildWeekly, loadUserData, volume } from "@/lib/data";
import { formatDate, formatNumber } from "@/lib/format";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default async function Dashboard({
  supabase,
  userId,
  readOnly = false,
}: {
  supabase: SupabaseClient;
  userId: string;
  readOnly?: boolean;
}) {
  const { workouts, cardio, weights } = await loadUserData(supabase, userId);
  const weekly = buildWeekly(workouts, cardio);

  const last30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const workouts30 = workouts.filter((w) => w.performed_on >= last30);
  const cardio30 = cardio.filter((c) => c.performed_on >= last30);
  const km30 = cardio30.reduce((s, c) => s + Number(c.distance_km ?? 0), 0);
  const currentWeight = weights.at(-1);
  const firstWeight = weights[0];
  const diff = currentWeight && firstWeight ? Number(currentWeight.weight_kg) - Number(firstWeight.weight_kg) : 0;

  const recent = [
    ...workouts.slice(0, 5).map((w) => ({
      date: w.performed_on,
      key: `w${w.id}`,
      title: w.title,
      detail: `${w.workout_sets.length} Sätze · ${formatNumber(volume(w), 0)} kg Volumen`,
      href: readOnly ? undefined : `/workouts/${w.id}`,
    })),
    ...cardio.slice(0, 5).map((c) => ({
      date: c.performed_on,
      key: `c${c.id}`,
      title: c.activity,
      detail: `${c.distance_km != null ? formatNumber(Number(c.distance_km)) + " km · " : ""}${c.duration_min} min`,
      href: undefined,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Workouts (30 Tage)" value={String(workouts30.length)} />
        <Stat label="Cardio (30 Tage)" value={`${cardio30.length}×`} hint={`${formatNumber(km30)} km`} />
        <Stat
          label="Aktuelles Gewicht"
          value={currentWeight ? `${formatNumber(Number(currentWeight.weight_kg))} kg` : "–"}
          hint={weights.length > 1 ? `${diff > 0 ? "+" : ""}${formatNumber(diff)} kg seit ${formatDate(firstWeight.measured_on)}` : undefined}
        />
        <Stat
          label="Volumen (30 Tage)"
          value={`${formatNumber(workouts30.reduce((s, w) => s + volume(w), 0) / 1000)} t`}
          hint="Wiederholungen × Gewicht"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold">Körpergewicht</h2>
          <WeightChart data={weights} />
        </section>
        <section className="card">
          <h2 className="mb-3 font-semibold">Trainingsvolumen pro Woche</h2>
          <VolumeChart data={weekly} />
        </section>
        <section className="card">
          <h2 className="mb-3 font-semibold">Cardio-Distanz pro Woche</h2>
          <CardioChart data={weekly} />
        </section>
        <section className="card">
          <h2 className="mb-3 font-semibold">Letzte Aktivitäten</h2>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Noch keine Aktivitäten</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((r) => {
                const inner = (
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-slate-500">{r.detail}</p>
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(r.date)}</span>
                  </div>
                );
                return <li key={r.key}>{r.href ? <Link href={r.href}>{inner}</Link> : inner}</li>;
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
