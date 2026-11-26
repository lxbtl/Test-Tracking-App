"use client";

import { useState, useTransition } from "react";
import { BMI_CLASSES, bmiClass, calcBmi } from "@/lib/bmi";
import { saveHeight } from "./actions";

// Skala von BMI 15 bis 40 für die Anzeige
const MIN = 15;
const MAX = 40;
const pos = (v: number) => `${((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * 100}%`;

export default function BmiCalculator({ height, weight }: { height: number | null; weight: number | null }) {
  const [h, setH] = useState<string>(height ? String(height) : "");
  const [w, setW] = useState<string>(weight ? String(weight) : "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const hNum = Number(h.replace(",", "."));
  const wNum = Number(w.replace(",", "."));
  const bmi = hNum >= 50 && hNum <= 250 && wNum > 0 ? calcBmi(wNum, hNum) : null;
  const cls = bmi ? bmiClass(bmi) : null;
  const heightChanged = hNum !== Number(height ?? 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="bmi_height">Größe (cm)</label>
          <input id="bmi_height" className="input" type="number" inputMode="decimal" min={50} max={250} value={h} onChange={(e) => setH(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="bmi_weight">Gewicht (kg)</label>
          <input id="bmi_weight" className="input" type="number" inputMode="decimal" min={1} step={0.1} value={w} onChange={(e) => setW(e.target.value)} />
        </div>
      </div>

      {bmi && cls ? (
        <div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold tabular-nums">{bmi.toLocaleString("de-DE", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</span>
            <span className={`font-semibold ${cls.color}`}>{cls.label}</span>
          </div>
          <div className="relative mt-3">
            <div className="flex h-3 overflow-hidden rounded-full">
              {BMI_CLASSES.map((c, i) => {
                const lo = i === 0 ? MIN : BMI_CLASSES[i - 1].max;
                const hi = Math.min(MAX, c.max);
                return <div key={c.label} className={c.bar} style={{ width: `${((hi - lo) / (MAX - MIN)) * 100}%` }} />;
              })}
            </div>
            <div className="absolute -top-1 h-5 w-1 -translate-x-1/2 rounded bg-slate-900" style={{ left: pos(bmi) }} aria-hidden />
            <div className="relative mt-1 h-3 text-[10px] text-slate-500">
              {[15, 18.5, 25, 30, 40].map((v, i, a) => (
                <span
                  key={v}
                  className={`absolute ${i === 0 ? "" : i === a.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
                  style={{ left: pos(v) }}
                >
                  {v.toLocaleString("de-DE")}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Der BMI ist nur ein grober Richtwert. Muskelmasse, Alter und Geschlecht berücksichtigt er nicht.
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Gib Größe und Gewicht ein, um deinen BMI zu sehen.</p>
      )}

      {heightChanged && hNum >= 50 && hNum <= 250 && (
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveHeight(hNum);
              setMsg(res.error ?? "Größe gespeichert.");
            })
          }
        >
          Größe in meinem Profil speichern
        </button>
      )}
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
    </div>
  );
}
