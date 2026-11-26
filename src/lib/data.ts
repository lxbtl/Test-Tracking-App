import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkoutType } from "./workout-types";

export type WorkoutSet = {
  id: number;
  set_number: number;
  reps: number;
  weight_kg: number;
  exercise: { id: number; name: string } | null;
};
export type CardioEntry = {
  id: number;
  duration_min: number;
  distance_km: number | null;
  exercise: { id: number; name: string } | null;
};
export type Workout = {
  id: number;
  user_id: string;
  performed_on: string;
  workout_type: WorkoutType;
  title: string;
  notes: string | null;
  workout_sets: WorkoutSet[];
  workout_cardio: CardioEntry[];
};
export type PlannedWorkout = {
  id: number;
  user_id: string;
  planned_on: string;
  workout_type: WorkoutType;
  title: string;
  notes: string | null;
  completed_workout_id: number | null;
};
export type BodyWeight = { id: number; user_id: string; measured_on: string; weight_kg: number };
export type Exercise = { id: number; name: string; workout_type: WorkoutType; owner_id: string | null };

export const WORKOUT_SELECT =
  "id, user_id, performed_on, workout_type, title, notes, " +
  "workout_sets(id, set_number, reps, weight_kg, exercise:exercises(id, name)), " +
  "workout_cardio(id, duration_min, distance_km, exercise:exercises(id, name))";

export function volume(w: Workout) {
  return w.workout_sets.reduce((sum, s) => sum + Number(s.reps) * Number(s.weight_kg), 0);
}

/** Kurzbeschreibung eines Workouts, z. B. "3 Übungen · 12 Sätze" oder "Laufen 35 min · 6,2 km" */
export function summary(w: Workout) {
  if (w.workout_type === "cardio") {
    return w.workout_cardio
      .map((c) => {
        const dist = c.distance_km != null ? ` · ${Number(c.distance_km).toLocaleString("de-DE")} km` : "";
        return `${c.exercise?.name ?? "Cardio"} ${c.duration_min} min${dist}`;
      })
      .join(", ");
  }
  const exercises = new Set(w.workout_sets.map((s) => s.exercise?.id)).size;
  return `${exercises} ${exercises === 1 ? "Übung" : "Übungen"} · ${w.workout_sets.length} Sätze`;
}

/** Montag der Woche als ISO-Datum */
export function weekStart(d: string) {
  const date = new Date(d + "T00:00:00Z");
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

export function addDays(d: string, n: number) {
  const date = new Date(d + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

export function buildWeeklyVolume(workouts: Workout[]) {
  const map = new Map<string, { week: string; volumen: number; workouts: number; cardioMin: number }>();
  for (const w of workouts) {
    const key = weekStart(w.performed_on);
    const e = map.get(key) ?? { week: key, volumen: 0, workouts: 0, cardioMin: 0 };
    e.volumen += volume(w);
    e.workouts += 1;
    e.cardioMin += w.workout_cardio.reduce((s, c) => s + c.duration_min, 0);
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => a.week.localeCompare(b.week)).map((e) => ({ ...e, volumen: Math.round(e.volumen) }));
}

export async function loadWorkouts(supabase: SupabaseClient, userId: string, sinceDays = 90) {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("workouts")
    .select(WORKOUT_SELECT)
    .eq("user_id", userId)
    .gte("performed_on", since)
    .order("performed_on", { ascending: false })
    .order("id", { ascending: false })
    .returns<Workout[]>();
  return data ?? [];
}

export async function loadWeights(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("body_weights")
    .select("*")
    .eq("user_id", userId)
    .order("measured_on", { ascending: true })
    .limit(730)
    .returns<BodyWeight[]>();
  return data ?? [];
}
