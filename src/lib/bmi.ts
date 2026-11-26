export function calcBmi(weightKg: number, heightCm: number) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export const BMI_CLASSES = [
  { max: 18.5, label: "Untergewicht", color: "text-sky-700", bar: "bg-sky-400" },
  { max: 25, label: "Normalgewicht", color: "text-emerald-700", bar: "bg-emerald-500" },
  { max: 30, label: "Übergewicht", color: "text-amber-700", bar: "bg-amber-400" },
  { max: Infinity, label: "Adipositas", color: "text-red-700", bar: "bg-red-500" },
];

export function bmiClass(bmi: number) {
  return BMI_CLASSES.find((c) => bmi < c.max)!;
}
