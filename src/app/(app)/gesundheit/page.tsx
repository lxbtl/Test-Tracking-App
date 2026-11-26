import { WeightChart } from "@/components/Charts";
import { requireAccess } from "@/lib/auth";
import { bmiClass, calcBmi } from "@/lib/bmi";
import { loadWeights } from "@/lib/data";
import { formatDate, formatNumber, today } from "@/lib/format";
import { deleteWeight } from "./actions";
import BmiCalculator from "./BmiCalculator";
import WeightForm from "./WeightForm";

export default async function HealthPage() {
  const { supabase, profile } = await requireAccess();
  const weights = await loadWeights(supabase, profile.id);
  const desc = [...weights].reverse();
  const current = desc[0];
  const since90 = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const recent = weights.filter((w) => w.measured_on >= since90);
  const first = recent[0];
  const diff = current && first ? Number(current.weight_kg) - Number(first.weight_kg) : null;
  const height = profile.height_cm ? Number(profile.height_cm) : null;
  const bmi = current && height ? calcBmi(Number(current.weight_kg), height) : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gesundheitsdaten</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Aktuelles Gewicht</p>
          <p className="mt-1 text-2xl font-bold">{current ? `${formatNumber(Number(current.weight_kg))} kg` : "–"}</p>
          {current && <p className="text-xs text-slate-500">{formatDate(current.measured_on)}</p>}
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Veränderung (90 Tage)</p>
          <p className="mt-1 text-2xl font-bold">{diff == null ? "–" : `${diff > 0 ? "+" : ""}${formatNumber(diff)} kg`}</p>
        </div>
        <div className="card col-span-2 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">BMI</p>
          <p className="mt-1 text-2xl font-bold">{bmi ? formatNumber(bmi) : "–"}</p>
          <p className="text-xs text-slate-500">{bmi ? bmiClass(bmi).label : "Größe im BMI-Rechner eintragen"}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card space-y-4 lg:col-span-3">
          <h2 className="font-semibold">Gewicht</h2>
          <WeightForm today={today()} />
          <WeightChart data={recent} />
        </section>
        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">BMI-Rechner</h2>
          <BmiCalculator key={`${height}-${current?.id}-${current?.weight_kg}`} height={height} weight={current ? Number(current.weight_kg) : null} />
        </section>
      </div>

      <details className="card">
        <summary className="cursor-pointer font-semibold">Alle Gewichtseinträge ({weights.length})</summary>
        <div className="mt-3 overflow-x-auto">
          {desc.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Noch keine Werte eingetragen.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Datum</th><th>Gewicht</th><th>Veränderung</th><th /></tr>
              </thead>
              <tbody>
                {desc.map((w, i) => {
                  const prev = desc[i + 1];
                  const d = prev ? Number(w.weight_kg) - Number(prev.weight_kg) : null;
                  return (
                    <tr key={w.id}>
                      <td>{formatDate(w.measured_on)}</td>
                      <td>{formatNumber(Number(w.weight_kg))} kg</td>
                      <td className={d == null ? "" : d > 0 ? "text-amber-600" : "text-emerald-600"}>
                        {d == null ? "–" : `${d > 0 ? "+" : ""}${formatNumber(d)} kg`}
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
      </details>
    </div>
  );
}
