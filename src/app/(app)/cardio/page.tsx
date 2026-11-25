import { requireAccess } from "@/lib/auth";
import type { Cardio } from "@/lib/data";
import { formatDate, formatNumber, today } from "@/lib/format";
import { deleteCardio } from "./actions";
import CardioForm from "./CardioForm";

function pace(c: Cardio) {
  if (!c.distance_km || Number(c.distance_km) === 0) return "–";
  const minPerKm = c.duration_min / Number(c.distance_km);
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${String(s).padStart(2, "0")} min/km`;
}

export default async function CardioPage() {
  const { supabase, profile } = await requireAccess();
  const { data } = await supabase
    .from("cardio_sessions")
    .select("*")
    .eq("user_id", profile.id)
    .order("performed_on", { ascending: false })
    .limit(100)
    .returns<Cardio[]>();
  const sessions = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cardio</h1>
      <CardioForm today={today()} />
      <div className="card overflow-x-auto">
        {sessions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Noch keine Einheiten eingetragen.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Datum</th><th>Aktivität</th><th>Distanz</th><th>Dauer</th><th>Tempo</th><th /></tr>
            </thead>
            <tbody>
              {sessions.map((c) => (
                <tr key={c.id}>
                  <td className="whitespace-nowrap">{formatDate(c.performed_on)}</td>
                  <td>{c.activity}{c.notes && <span className="block text-xs text-slate-500">{c.notes}</span>}</td>
                  <td className="whitespace-nowrap">{c.distance_km != null ? `${formatNumber(Number(c.distance_km))} km` : "–"}</td>
                  <td className="whitespace-nowrap">{c.duration_min} min</td>
                  <td className="whitespace-nowrap">{pace(c)}</td>
                  <td className="text-right">
                    <form action={deleteCardio}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="btn-danger" aria-label="Eintrag löschen">✕</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
