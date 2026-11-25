"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const shortDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
const de = (n: number) => n.toLocaleString("de-DE");

function Empty() {
  return <p className="py-12 text-center text-sm text-slate-400">Noch keine Daten</p>;
}

export function WeightChart({ data }: { data: { measured_on: string; weight_kg: number }[] }) {
  if (!data.length) return <Empty />;
  const values = data.map((d) => Number(d.weight_kg));
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data.map((d) => ({ ...d, weight_kg: Number(d.weight_kg) }))} margin={{ left: -16, right: 8 }}>
        <CartesianGrid stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="measured_on" tickFormatter={shortDate} tick={{ fontSize: 12 }} minTickGap={24} />
        <YAxis domain={[min, max]} tick={{ fontSize: 12 }} />
        <Tooltip labelFormatter={(l) => shortDate(String(l))} formatter={(v) => [`${de(Number(v))} kg`, "Gewicht"]} />
        <Line type="monotone" dataKey="weight_kg" stroke="#059669" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

type Weekly = { week: string; volumen: number; km: number; minuten: number; workouts: number };

export function VolumeChart({ data }: { data: Weekly[] }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -4, right: 8 }}>
        <CartesianGrid stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="week" tickFormatter={shortDate} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v / 1000)}t`} />
        <Tooltip
          labelFormatter={(l) => `Woche ab ${shortDate(String(l))}`}
          formatter={(v) => [`${de(Number(v))} kg`, "Volumen"]}
        />
        <Bar dataKey="volumen" fill="#059669" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CardioChart({ data }: { data: Weekly[] }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -16, right: 8 }}>
        <CartesianGrid stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="week" tickFormatter={shortDate} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          labelFormatter={(l) => `Woche ab ${shortDate(String(l))}`}
          formatter={(v, name) => (name === "km" ? [`${de(Number(v))} km`, "Distanz"] : [`${v} min`, "Dauer"])}
        />
        <Bar dataKey="km" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
