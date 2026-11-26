"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import type { Exercise } from "@/lib/data";
import { isWorkoutType, REPS, SETS, TYPE_META } from "@/lib/workout-types";

export type FormState = { error?: string };

type StrengthInput = { exercise_id: number; sets: number; reps: number; weight_kg: number };
type CardioInput = { exercise_id: number; duration_min: number; distance_km: number | null };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

export async function createWorkout(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, profile } = await requireAccess();

  const workout_type = formData.get("workout_type");
  if (!isWorkoutType(workout_type)) return { error: "Bitte wähle eine Trainingsart." };
  const performed_on = String(formData.get("performed_on") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(performed_on)) return { error: "Bitte wähle ein Datum." };
  const title = String(formData.get("title") ?? "").trim() || TYPE_META[workout_type].label;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const planId = Number(formData.get("plan_id")) || null;

  let entries: (StrengthInput | CardioInput)[];
  try {
    entries = JSON.parse(String(formData.get("entries") ?? "[]"));
  } catch {
    return { error: "Ungültige Eingaben." };
  }
  if (!Array.isArray(entries) || entries.length === 0) return { error: "Bitte wähle mindestens eine Übung aus." };

  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({ user_id: profile.id, workout_type, performed_on, title, notes })
    .select("id")
    .single();
  if (error || !workout) return { error: "Workout konnte nicht gespeichert werden." };

  let insertError;
  if (workout_type === "cardio") {
    const rows = (entries as CardioInput[]).map((e) => ({
      workout_id: workout.id,
      exercise_id: Number(e.exercise_id),
      duration_min: clamp(Number(e.duration_min) || 1, 1, 1440),
      distance_km: e.distance_km != null && Number(e.distance_km) > 0 ? Number(e.distance_km) : null,
    }));
    ({ error: insertError } = await supabase.from("workout_cardio").insert(rows));
  } else {
    const rows = (entries as StrengthInput[]).flatMap((e) => {
      const sets = clamp(Number(e.sets) || SETS.default, SETS.min, SETS.max);
      const reps = clamp(Number(e.reps) || REPS.default, REPS.min, REPS.max);
      const weight_kg = Math.max(0, Number(e.weight_kg) || 0);
      return Array.from({ length: sets }, (_, i) => ({
        workout_id: workout.id,
        exercise_id: Number(e.exercise_id),
        set_number: i + 1,
        reps,
        weight_kg,
      }));
    });
    ({ error: insertError } = await supabase.from("workout_sets").insert(rows));
  }
  if (insertError) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    return { error: "Übungen konnten nicht gespeichert werden." };
  }

  if (planId) {
    await supabase
      .from("planned_workouts")
      .update({ completed_workout_id: workout.id })
      .eq("id", planId)
      .eq("user_id", profile.id);
  }

  revalidatePath("/trainingsplan");
  revalidatePath("/workouts");
  redirect(`/workouts/${workout.id}`);
}

export async function createExercise(
  name: string,
  workoutType: string,
): Promise<{ exercise?: Exercise; error?: string }> {
  const { supabase, profile } = await requireAccess();
  const clean = name.trim().slice(0, 60);
  if (!clean) return { error: "Bitte gib einen Namen ein." };
  if (!isWorkoutType(workoutType)) return { error: "Ungültige Trainingsart." };
  const { data, error } = await supabase
    .from("exercises")
    .insert({ name: clean, workout_type: workoutType, owner_id: profile.id })
    .select("id, name, workout_type, owner_id")
    .single<Exercise>();
  if (error) {
    return { error: error.code === "23505" ? "Diese Übung gibt es schon." : "Übung konnte nicht angelegt werden." };
  }
  return { exercise: data };
}

export async function deleteOwnExercise(id: number): Promise<{ error?: string }> {
  const { supabase, profile } = await requireAccess();
  const { error } = await supabase.from("exercises").delete().eq("id", id).eq("owner_id", profile.id);
  if (error) return { error: "Die Übung wird schon in einem Workout verwendet und kann nicht gelöscht werden." };
  return {};
}

export async function deleteWorkout(formData: FormData) {
  const { supabase } = await requireAccess();
  await supabase.from("workouts").delete().eq("id", Number(formData.get("id")));
  revalidatePath("/trainingsplan");
  revalidatePath("/workouts");
  redirect("/workouts");
}
