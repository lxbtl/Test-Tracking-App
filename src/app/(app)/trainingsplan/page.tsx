import Link from "next/link";
import { requireAccess } from "@/lib/auth";
import { addDays, summary, weekStart, WORKOUT_SELECT, type PlannedWorkout, type Workout } from "@/lib/data";
import { today } from "@/lib/format";
import { TYPE_META } from "@/lib/workout-types";
import { deletePlan } from "./actions";
import PlanForm from "./PlanForm";

type View = "tag" | "woche" | "monat";
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function fmt(d: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(d + "T00:00:00").toLocaleDateString("de-DE", opts);
}

function range(view: View, d: string) {
  if (view === "tag") return { from: d, to: d, prev: addDays(d, -1), next: addDays(d, 1) };
  if (view === "woche") {
    const from = weekStart(d);
    return { from, to: addDays(from, 6), prev: addDays(from, -7), next: addDays(from, 7) };
  }
  const first = d.slice(0, 8) + "01";
  const nextMonth = new Date(first + "T00:00:00Z");
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const last = addDays(nextMonth.toISOString().slice(0, 10), -1);
  const prevMonth = new Date(first + "T00:00:00Z");
  prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1);
  return {
    from: weekStart(first),
    to: addDays(weekStart(last), 6),
    prev: prevMonth.toISOString().slice(0, 10),
    next: nextMonth.toISOString().slice(0, 10),
    monthStart: first,
  };
}

function title(view: View, from: string, to: string, d: string) {
  if (view === "tag") return fmt(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (view === "woche") return `${fmt(from, { day: "numeric", month: "short" })} – ${fmt(to, { day: "numeric", month: "short", year: "numeric" })}`;
  return fmt(d.slice(0, 8) + "01", { month: "long", year: "numeric" });
}

export default async function TrainingsplanPage({
  searchParams,
}: {
  searchParams: Promise<{ ansicht?: string; datum?: string }>;
}) {
  const sp = await searchParams;
  const view: View = sp.ansicht === "tag" || sp.ansicht === "monat" ? sp.ansicht : "woche";
  const todayStr = today();
  const d = sp.datum && /^\d{4}-\d{2}-\d{2}$/.test(sp.datum) ? sp.datum : todayStr;
  const r = range(view, d);

  const { supabase, profile } = await requireAccess();
  const [plans, workouts] = await Promise.all([
    supabase
      .from("planned_workouts")
      .select("*")
      .eq("user_id", profile.id)
      .gte("planned_on", r.from)
      .lte("planned_on", r.to)
      .order("planned_on")
      .returns<PlannedWorkout[]>(),
    supabase
      .from("workouts")
      .select(WORKOUT_SELECT)
      .eq("user_id", profile.id)
      .gte("performed_on", r.from)
      .lte("performed_on", r.to)
      .order("performed_on")
      .returns<Workout[]>(),
  ]);

  const days: string[] = [];
  for (let x = r.from; x <= r.to; x = addDays(x, 1)) days.push(x);
  const byDay = (day: string) => ({
    open: (plans.data ?? []).filter((p) => p.planned_on === day && !p.completed_workout_id),
    done: (workouts.data ?? []).filter((w) => w.performed_on === day),
  });

  const href = (v: View, date: string) => `/trainingsplan?ansicht=${v}&datum=${date}`;
  const startHref = (p: PlannedWorkout) => `/workouts/neu?typ=${p.workout_type}&plan=${p.id}&datum=${p.planned_on}`;

  const openPlans = (plans.data ?? []).filter((p) => !p.completed_workout_id);
  const doneCount = (workouts.data ?? []).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Trainingsplan</h1>
        <div className="grid grid-cols-3 rounded-lg bg-slate-200/70 p-1 text-sm font-medium">
          {(["tag", "woche", "monat"] as View[]).map((v) => (
            <Link
              key={v}
              href={href(v, d)}
              className={`rounded-md px-3 py-1 text-center ${view === v ? "bg-white shadow-sm" : "text-slate-600"}`}
            >
              {v === "tag" ? "Tag" : v === "woche" ? "Woche" : "Monat"}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link href={href(view, r.prev)} className="btn-secondary" aria-label="Zurück">←</Link>
          <Link href={href(view, todayStr)} className="btn-secondary">Heute</Link>
          <Link href={href(view, r.next)} className="btn-secondary" aria-label="Weiter">→</Link>
        </div>
        <p className="text-right font-semibold">{title(view, r.from, r.to, d)}</p>
      </div>

      <p className="text-sm text-slate-500">
        {doneCount} erledigt · {openPlans.length} geplant in diesem Zeitraum
      </p>

      {view === "monat" && (
        <div className="card overflow-hidden p-0 sm:p-0">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-500">
            {WEEKDAYS.map((w) => <div key={w} className="py-2">{w}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const { open, done } = byDay(day);
              const inMonth = day.slice(0, 7) === d.slice(0, 7);
              return (
                <Link
                  key={day}
                  href={href("tag", day)}
                  className={`min-h-16 border-b border-r border-slate-100 p-1 text-left hover:bg-emerald-50/50 sm:min-h-24 sm:p-1.5 ${inMonth ? "" : "bg-slate-50/70 text-slate-400"}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${day === todayStr ? "bg-emerald-600 font-bold text-white" : ""}`}>
                    {Number(day.slice(8))}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {done.map((w) => (
                      <div key={`w${w.id}`} className={`truncate rounded border px-1 text-[10px] font-medium sm:text-xs ${TYPE_META[w.workout_type].badge}`}>
                        <span className="sm:hidden">✓</span>
                        <span className="hidden sm:inline">✓ {TYPE_META[w.workout_type].label}</span>
                      </div>
                    ))}
                    {open.map((p) => (
                      <div key={`p${p.id}`} className="truncate rounded border border-dashed border-slate-300 bg-white px-1 text-[10px] text-slate-600 sm:text-xs">
                        <span className={`mr-1 inline-block h-2 w-2 rounded-full ${TYPE_META[p.workout_type].dot}`} />
                        <span className="hidden sm:inline">{TYPE_META[p.workout_type].label}</span>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {view !== "monat" && (
        <div className={view === "woche" ? "grid gap-2 md:grid-cols-7" : "space-y-2"}>
          {days.map((day) => {
            const { open, done } = byDay(day);
            const isToday = day === todayStr;
            const past = day < todayStr;
            return (
              <section key={day} className={`card p-3 sm:p-3 ${isToday ? "border-emerald-400 ring-1 ring-emerald-200" : ""}`}>
                <Link href={href("tag", day)} className="mb-2 flex items-baseline justify-between md:block">
                  <span className="text-sm font-semibold">{fmt(day, { weekday: view === "tag" ? "long" : "short" })}</span>
                  <span className={`text-xs md:ml-1 ${isToday ? "font-bold text-emerald-700" : "text-slate-500"}`}>
                    {fmt(day, { day: "2-digit", month: "2-digit" })}
                  </span>
                </Link>
                <div className="space-y-1.5">
                  {done.map((w) => (
                    <Link key={`w${w.id}`} href={`/workouts/${w.id}`} className={`block rounded-lg border px-2 py-1.5 text-xs ${TYPE_META[w.workout_type].badge}`}>
                      <p className="font-semibold">✓ {w.title}</p>
                      {view === "tag" && <p className="mt-0.5 opacity-80">{summary(w)}</p>}
                    </Link>
                  ))}
                  {open.map((p) => (
                    <div key={`p${p.id}`} className="rounded-lg border border-dashed border-slate-300 bg-white px-2 py-1.5 text-xs">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold">
                          <span className={`mr-1 inline-block h-2 w-2 rounded-full ${TYPE_META[p.workout_type].dot}`} />
                          {p.title}
                        </p>
                        <form action={deletePlan}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="text-slate-400 hover:text-red-600" aria-label="Plan entfernen" title="Plan entfernen">✕</button>
                        </form>
                      </div>
                      {p.notes && <p className="mt-0.5 text-slate-500">{p.notes}</p>}
                      <Link href={startHref(p)} className="mt-1 inline-block font-semibold text-emerald-700 hover:underline">
                        {past ? "Nachtragen" : "Starten"} →
                      </Link>
                    </div>
                  ))}
                  {done.length === 0 && open.length === 0 && (
                    <p className="text-xs text-slate-400">{view === "tag" ? "Nichts geplant." : "–"}</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <PlanForm defaultDate={view === "tag" ? d : d < todayStr ? todayStr : d} />
    </div>
  );
}
