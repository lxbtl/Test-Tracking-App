import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkoutSet = {
  id: number;
  set_number: number;
  reps: number;
  weight_kg: number;
  exercise: { id: number; name: string } | null;
};
export type Workout = {
  id: number;
  user_id: string;
  performed_on: string;
  title: string;
  notes: string | null;
  workout_sets: WorkoutSet[];
};
export type Cardio = {
  id: number;
  user_id: string;
  performed_on: string;
  activity: string;
  distance_km: number | null;
  duration_min: number;
  notes: string | null;
};
export type BodyWeight = { id: number; user_id: string; measured_on: string; weight_kg: number };

export const WORKOUT_SELECT =
  "id, user_id, performed_on, title, notes, workout_sets(id, set_number, reps, weight_kg, exercise:exercises(id, name))";

export function volume(w: Workout) {
  return w.workout_sets.reduce((sum, s) => sum + Number(s.reps) * Number(s.weight_kg), 0);
}

/** Montag der Woche als ISO-Datum */
export function weekStart(d: string) {
  const date = new Date(d + "T00:00:00Z");
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

export async function loadUserData(supabase: SupabaseClient, userId: string, sinceDays = 90) {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10);
  const [workouts, cardio, weights] = await Promise.all([
    supabase
      .from("workouts")
      .select(WORKOUT_SELECT)
      .eq("user_id", userId)
      .gte("performed_on", since)
      .order("performed_on", { ascending: false })
      .returns<Workout[]>(),
    supabase
      .from("cardio_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("performed_on", since)
      .order("performed_on", { ascending: false })
      .returns<Cardio[]>(),
    supabase
      .from("body_weights")
      .select("*")
      .eq("user_id", userId)
      .gte("measured_on", since)
      .order("measured_on", { ascending: true })
      .returns<BodyWeight[]>(),
  ]);
  return {
    workouts: workouts.data ?? [],
    cardio: cardio.data ?? [],
    weights: weights.data ?? [],
  };
}

export function buildWeekly(workouts: Workout[], cardio: Cardio[]) {
  const map = new Map<string, { week: string; volumen: number; km: number; minuten: number; workouts: number }>();
  const get = (w: string) => {
    if (!map.has(w)) map.set(w, { week: w, volumen: 0, km: 0, minuten: 0, workouts: 0 });
    return map.get(w)!;
  };
  for (const w of workouts) {
    const e = get(weekStart(w.performed_on));
    e.volumen += volume(w);
    e.workouts += 1;
  }
  for (const c of cardio) {
    const e = get(weekStart(c.performed_on));
    e.km += Number(c.distance_km ?? 0);
    e.minuten += c.duration_min;
  }
  return [...map.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((e) => ({ ...e, volumen: Math.round(e.volumen), km: Math.round(e.km * 10) / 10 }));
}
