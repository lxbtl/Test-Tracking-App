import Link from "next/link";
import { VolumeChart, WeightChart } from "@/components/Charts";
import { requireAccess } from "@/lib/auth";
import { bmiClass, calcBmi } from "@/lib/bmi";
import {
  addDays,
  buildWeeklyVolume,
  loadWeights,
  loadWorkouts,
  summary,
  volume,
  weekStart,
  type PlannedWorkout,
} from "@/lib/data";
import { formatDate, formatNumber, today } from "@/lib/format";
import { quoteOfDay } from "@/lib/quotes";
import { TYPE_META } from "@/lib/workout-types";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function greeting() {
  const h = parseInt(
    new Intl.DateTimeFormat("de-DE", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Berlin" }).format(new Date()),
    10,
  );
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Hallo";
  return "Guten Abend";
}

function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="card hover:border-emerald-300">{inner}</Link>
  ) : (
    <div className="card">{inner}</div>
  );
}

export default async function HomePage() {
  const { supabase, profile } = await requireAccess();
  const t = today();
  const monday = weekStart(t);
  const sunday = addDays(monday, 6);

  const [workouts, weights, plansRes] = await Promise.all([
    loadWorkouts(supabase, profile.id, 70),
    loadWeights(supabase, profile.id),
    supabase
      .from("planned_workouts")
      .select("*")
      .eq("user_id", profile.id)
      .gte("planned_on", monday)
      .lte("planned_on", addDays(t, 30))
      .order("planned_on")
      .returns<PlannedWorkout[]>(),
  ]);
  const plans = plansRes.data ?? [];

  // Heute
  const todayPlans = plans.filter((p) => p.planned_on === t && !p.completed_workout_id);
  const todayDone = workouts.filter((w) => w.performed_on === t);
  const nextPlan = plans.find((p) => p.planned_on > t && !p.completed_workout_id);

  // Diese Woche
  const weekWorkouts = workouts.filter((w) => w.performed_on >= monday && w.performed_on <= sunday);
  const weekPlans = plans.filter((p) => p.planned_on <= sunday);
  const weekGoal = Math.max(weekPlans.length, weekWorkouts.length);
  const weekPct = weekGoal ? Math.round((weekWorkouts.length / weekGoal) * 100) : 0;

  // Volumen diese Woche vs. gleicher Zeitraum der Vorwoche (Mo bis heutiger Wochentag)
  const lastMonday = addDays(monday, -7);
  const volThis = weekWorkouts.reduce((s, w) => s + volume(w), 0);
  const volLast = workouts
    .filter((w) => w.performed_on >= lastMonday && w.performed_on <= addDays(t, -7))
    .reduce((s, w) => s + volume(w), 0);
  const volDiff = volLast ? Math.round(((volThis - volLast) / volLast) * 100) : null;

  // Serie: Wochen in Folge mit mindestens einem Training (aktuelle Woche zählt, wenn schon trainiert)
  let streak = 0;
  for (let wk = weekWorkouts.length ? monday : lastMonday; ; wk = addDays(wk, -7)) {
    const end = addDays(wk, 6);
    if (workouts.some((w) => w.performed_on >= wk && w.performed_on <= end)) streak++;
    else break;
  }

  // Gewicht
  const current = weights.at(-1);
  const since30 = addDays(t, -30);
  const ref = weights.find((w) => w.measured_on >= since30);
  const wDiff = current && ref ? Number(current.weight_kg) - Number(ref.weight_kg) : null;
  const height = profile.height_cm ? Number(profile.height_cm) : null;
  const bmi = current && height ? calcBmi(Number(current.weight_kg), height) : null;

  const weekly = buildWeeklyVolume(workouts.filter((w) => w.performed_on >= addDays(monday, -49)));
  const dateLong = new Date(t + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Begrüßung + Zitat */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white shadow-sm sm:p-7">
        <p className="text-sm font-medium text-emerald-100">{dateLong}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          {greeting()}, {profile.display_name ?? "Sportler"}!
        </h1>
        <blockquote className="mt-4 border-l-4 border-emerald-300/70 pl-3 text-base italic text-emerald-50 sm:text-lg">
          „{quoteOfDay(t)}“
        </blockquote>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Heute im Plan */}
        <section className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Heute im Plan</h2>
            <Link href="/trainingsplan?ansicht=tag" className="text-sm text-emerald-700 hover:underline">Zum Kalender →</Link>
          </div>
          {todayPlans.length === 0 && todayDone.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-medium">Heute ist nichts geplant – Ruhetag 😌</p>
              {nextPlan ? (
                <p className="mt-1 text-sm text-slate-600">
                  Nächstes Training: <strong>{nextPlan.title}</strong> am {formatDate(nextPlan.planned_on)}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-600">Plane dein nächstes Training im Kalender.</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/workouts/neu" className="btn">Trotzdem trainieren</Link>
                <Link href="/trainingsplan" className="btn-secondary">Training einplanen</Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {todayDone.map((w) => (
                <Link key={w.id} href={`/workouts/${w.id}`} className={`flex items-center justify-between rounded-xl border p-3 ${TYPE_META[w.workout_type].badge}`}>
                  <div>
                    <p className="font-semibold">✓ {w.title} erledigt</p>
                    <p className="text-sm opacity-80">{summary(w)}</p>
                  </div>
                  <span className="text-2xl">{TYPE_META[w.workout_type].emoji}</span>
                </Link>
              ))}
              {todayPlans.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 p-3">
                  <div>
                    <p className="font-semibold">
                      <span className="mr-1">{TYPE_META[p.workout_type].emoji}</span>
                      {p.title}
                    </p>
                    {p.notes && <p className="text-sm text-slate-500">{p.notes}</p>}
                  </div>
                  <Link href={`/workouts/neu?typ=${p.workout_type}&plan=${p.id}&datum=${p.planned_on}`} className="btn shrink-0">
                    Starten
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Wochenstreifen */}
          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((wd, i) => {
              const day = addDays(monday, i);
              const done = workouts.filter((w) => w.performed_on === day);
              const open = plans.filter((p) => p.planned_on === day && !p.completed_workout_id);
              const isToday = day === t;
              return (
                <Link
                  key={day}
                  href={`/trainingsplan?ansicht=tag&datum=${day}`}
                  className={`rounded-lg border p-1.5 ${isToday ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
                >
                  <p className={`text-xs ${isToday ? "font-bold text-emerald-700" : "text-slate-500"}`}>{wd}</p>
                  <div className="mt-1 flex min-h-4 flex-wrap justify-center gap-0.5">
                    {done.map((w) => (
                      <span key={w.id} className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white ${TYPE_META[w.workout_type].dot}`}>✓</span>
                    ))}
                    {open.map((p) => (
                      <span key={p.id} className={`h-4 w-4 rounded-full border-2 border-dashed ${TYPE_META[p.workout_type].ring}`} />
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Wochenziel */}
        <section className="card flex flex-col justify-between">
          <div>
            <h2 className="font-semibold">Diese Woche</h2>
            <p className="mt-2 text-4xl font-bold">
              {weekWorkouts.length}
              <span className="text-lg font-medium text-slate-400"> / {weekGoal || "–"}</span>
            </p>
            <p className="text-sm text-slate-500">Trainings erledigt</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${weekPct}%` }} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Serie</p>
              <p className="font-semibold">🔥 {streak} {streak === 1 ? "Woche" : "Wochen"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Volumen ggü. Vorwoche (bis heute)</p>
              <p className={`font-semibold ${volDiff == null ? "" : volDiff >= 0 ? "text-emerald-700" : "text-amber-700"}`}>
                {volDiff == null ? "–" : `${volDiff > 0 ? "+" : ""}${volDiff} %`}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Trainings (30 Tage)" value={String(workouts.filter((w) => w.performed_on >= since30).length)} href="/workouts" />
        <Stat label="Volumen diese Woche" value={`${formatNumber(volThis / 1000)} t`} hint="Wiederholungen × Gewicht" href="/workouts" />
        <Stat
          label="Gewicht"
          value={current ? `${formatNumber(Number(current.weight_kg))} kg` : "–"}
          hint={wDiff != null ? `${wDiff > 0 ? "+" : ""}${formatNumber(wDiff)} kg in 30 Tagen` : undefined}
          href="/gesundheit"
        />
        <Stat label="BMI" value={bmi ? formatNumber(bmi) : "–"} hint={bmi ? bmiClass(bmi).label : "Größe eintragen"} href="/gesundheit" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold">Trainingsvolumen pro Woche</h2>
          <VolumeChart data={weekly} />
        </section>
        <section className="card">
          <h2 className="mb-3 font-semibold">Gewichtsverlauf</h2>
          <WeightChart data={weights.filter((w) => w.measured_on >= addDays(t, -60))} />
        </section>
      </div>

      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Letzte Workouts</h2>
          <Link href="/workouts" className="text-sm text-emerald-700 hover:underline">Alle →</Link>
        </div>
        {workouts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Noch keine Workouts – leg los!</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {workouts.slice(0, 5).map((w) => (
              <li key={w.id}>
                <Link href={`/workouts/${w.id}`} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <span className={`mr-2 inline-block h-2 w-2 rounded-full ${TYPE_META[w.workout_type].dot}`} />
                      {w.title}
                    </p>
                    <p className="truncate text-xs text-slate-500">{summary(w)}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{formatDate(w.performed_on)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
