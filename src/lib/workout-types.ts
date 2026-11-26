export const WORKOUT_TYPES = ["push", "pull", "leg", "cardio"] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const TYPE_META: Record<WorkoutType, { label: string; emoji: string; badge: string; dot: string; ring: string }> = {
  push: { label: "Push-Day", emoji: "💪", badge: "bg-orange-100 text-orange-800 border-orange-200", dot: "bg-orange-500", ring: "border-orange-500" },
  pull: { label: "Pull-Day", emoji: "🧗", badge: "bg-sky-100 text-sky-800 border-sky-200", dot: "bg-sky-500", ring: "border-sky-500" },
  leg: { label: "Leg-Day", emoji: "🦵", badge: "bg-violet-100 text-violet-800 border-violet-200", dot: "bg-violet-500", ring: "border-violet-500" },
  cardio: { label: "Cardio", emoji: "🏃", badge: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500", ring: "border-emerald-500" },
};

export function isWorkoutType(v: unknown): v is WorkoutType {
  return typeof v === "string" && (WORKOUT_TYPES as readonly string[]).includes(v);
}

export const SETS = { min: 1, max: 10, default: 4 };
export const REPS = { min: 1, max: 12, default: 10 };
