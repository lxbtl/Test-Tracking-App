import Link from "next/link";
import { requireAdmin, type Profile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { TYPE_META, WORKOUT_TYPES, type WorkoutType } from "@/lib/workout-types";
import { addExercise, addInvite, deleteExercise, removeInvite, setEarlyAccess, setRole } from "./actions";

export default async function AdminPage() {
  const { supabase, profile: me } = await requireAdmin();

  const [profiles, invites, exercises, workouts, plans, weights, sets] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at").returns<Profile[]>(),
    supabase.from("early_access_invites").select("*").order("created_at", { ascending: false }),
    supabase.from("exercises").select("id, name, workout_type").is("owner_id", null).order("id").returns<{ id: number; name: string; workout_type: WorkoutType }[]>(),
    supabase.from("workouts").select("user_id, performed_on, workout_type"),
    supabase.from("planned_workouts").select("user_id").is("completed_workout_id", null),
    supabase.from("body_weights").select("user_id"),
    supabase.from("workout_sets").select("id", { count: "exact", head: true }),
  ]);

  const count = (rows: { user_id: string }[] | null, id: string) => rows?.filter((r) => r.user_id === id).length ?? 0;
  const lastActive = (id: string) =>
    workouts.data?.filter((w) => w.user_id === id).map((w) => w.performed_on).sort().at(-1);
  const users = profiles.data ?? [];
  const waiting = users.filter((u) => !u.early_access && u.role !== "admin");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin-Bereich</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Nutzer", users.length],
          ["Warteliste", waiting.length],
          ["Workouts", workouts.data?.length ?? 0],
          ["Sätze", sets.count ?? 0],
          ["Geplante Trainings", plans.data?.length ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="card">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Nutzer</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Name / E-Mail</th><th>Rolle</th><th>Early Access</th><th>Workouts</th><th>Geplant</th><th>Gewicht</th>
              <th>Zuletzt aktiv</th><th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <p className="font-medium">{u.display_name ?? "–"}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td>
                  <form action={setRole} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="value" value={u.role === "admin" ? "user" : "admin"} />
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${u.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}>
                      {u.role === "admin" ? "Admin" : "Nutzer"}
                    </span>
                    {u.id !== me.id && (
                      <button className="text-xs text-slate-500 hover:underline">
                        {u.role === "admin" ? "zu Nutzer" : "zu Admin"}
                      </button>
                    )}
                  </form>
                </td>
                <td>
                  <form action={setEarlyAccess}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="value" value={String(!u.early_access)} />
                    <button
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${u.early_access ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                      title="Klicken zum Umschalten"
                    >
                      {u.early_access ? "Freigeschaltet" : "Wartet – freischalten"}
                    </button>
                  </form>
                </td>
                <td>{count(workouts.data, u.id)}</td>
                <td>{count(plans.data, u.id)}</td>
                <td>{count(weights.data, u.id)}</td>
                <td className="whitespace-nowrap">{lastActive(u.id) ? formatDate(lastActive(u.id)!) : "–"}</td>
                <td>
                  <Link href={`/admin/nutzer/${u.id}`} className="btn-secondary whitespace-nowrap">Daten ansehen</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-1 font-semibold">Early-Access-Einladungen</h2>
          <p className="mb-3 text-xs text-slate-500">
            Eingeladene E-Mail-Adressen sind bei der Registrierung sofort freigeschaltet. Bestehende Konten werden beim
            Einladen direkt freigeschaltet.
          </p>
          <form action={addInvite} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input className="input" name="email" type="email" placeholder="E-Mail-Adresse" required />
            <input className="input" name="note" placeholder="Notiz (optional)" />
            <button className="btn shrink-0">Einladen</button>
          </form>
          <ul className="divide-y divide-slate-100">
            {(invites.data ?? []).map((i) => (
              <li key={i.email} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {i.email}
                  {i.note && <span className="ml-2 text-xs text-slate-500">{i.note}</span>}
                </span>
                <form action={removeInvite}>
                  <input type="hidden" name="email" value={i.email} />
                  <button className="btn-danger" aria-label="Einladung entfernen">✕</button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-1 font-semibold">Grundübungen</h2>
          <p className="mb-3 text-xs text-slate-500">Stehen allen Nutzern zur Auswahl. Eigene Übungen legen Nutzer selbst an.</p>
          <form action={addExercise} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input className="input" name="name" placeholder="Name der Übung" required />
            <select className="input sm:w-40" name="workout_type" defaultValue="push" aria-label="Trainingsart">
              {WORKOUT_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_META[t].label}</option>
              ))}
            </select>
            <button className="btn shrink-0">Hinzufügen</button>
          </form>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {(exercises.data ?? []).map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {e.name}
                  <span className={`ml-2 rounded border px-1.5 text-xs ${TYPE_META[e.workout_type].badge}`}>{TYPE_META[e.workout_type].label}</span>
                </span>
                <form action={deleteExercise}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="btn-danger" aria-label="Übung löschen" title="Nur möglich, wenn die Übung noch nicht verwendet wurde">✕</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
