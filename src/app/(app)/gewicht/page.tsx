import { WeightChart } from "@/components/Charts";
import { requireAccess } from "@/lib/auth";
import type { BodyWeight } from "@/lib/data";
import { formatDate, formatNumber, today } from "@/lib/format";
import { deleteWeight } from "./actions";
import WeightForm from "./WeightForm";

export default async function WeightPage() {
  const { supabase, profile } = await requireAccess();
  const { data } = await supabase
    .from("body_weights")
    .select("*")
    .eq("user_id", profile.id)
    .order("measured_on", { ascending: false })
    .limit(365)
    .returns<BodyWeight[]>();
  const weights = data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Körpergewicht</h1>
      <WeightForm today={today()} />
      <section className="card">
        <h2 className="mb-3 font-semibold">Verlauf</h2>
        <WeightChart data={[...weights].reverse()} />
      </section>
      <div className="card overflow-x-auto">
        {weights.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Noch keine Werte eingetragen.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Datum</th><th>Gewicht</th><th>Veränderung</th><th /></tr>
            </thead>
            <tbody>
              {weights.map((w, i) => {
                const prev = weights[i + 1];
                const diff = prev ? Number(w.weight_kg) - Number(prev.weight_kg) : null;
                return (
                  <tr key={w.id}>
                    <td>{formatDate(w.measured_on)}</td>
                    <td>{formatNumber(Number(w.weight_kg))} kg</td>
                    <td className={diff == null ? "" : diff > 0 ? "text-amber-600" : "text-emerald-600"}>
                      {diff == null ? "–" : `${diff > 0 ? "+" : ""}${formatNumber(diff)} kg`}
                    </td>
                    <td className="text-right">
                      <form action={deleteWeight}>
                        <input type="hidden" name="id" value={w.id} />
                        <button className="btn-danger" aria-label="Eintrag löschen">✕</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
