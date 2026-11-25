"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth";

export type FormState = { error?: string };

type SetInput = { exercise_id: number; reps: number; weight_kg: number };

export async function createWorkout(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, profile } = await requireAccess();

  const title = String(formData.get("title") ?? "").trim();
  const performed_on = String(formData.get("performed_on") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  let sets: SetInput[] = [];
  try {
    sets = JSON.parse(String(formData.get("sets") ?? "[]"));
  } catch {
    return { error: "Ungültige Sätze." };
  }
  sets = sets.filter((s) => s.exercise_id && s.reps > 0);

  if (!title) return { error: "Bitte gib einen Titel ein." };
  if (!performed_on) return { error: "Bitte wähle ein Datum." };
  if (sets.length === 0) return { error: "Bitte mindestens einen Satz mit Übung und Wiederholungen eintragen." };

  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({ user_id: profile.id, title, performed_on, notes })
    .select("id")
    .single();
  if (error || !workout) return { error: "Workout konnte nicht gespeichert werden." };

  const counter = new Map<number, number>();
  const rows = sets.map((s) => {
    const n = (counter.get(s.exercise_id) ?? 0) + 1;
    counter.set(s.exercise_id, n);
    return {
      workout_id: workout.id,
      exercise_id: s.exercise_id,
      set_number: n,
      reps: Math.round(s.reps),
      weight_kg: Math.max(0, Number(s.weight_kg) || 0),
    };
  });
  const { error: setError } = await supabase.from("workout_sets").insert(rows);
  if (setError) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    return { error: "Sätze konnten nicht gespeichert werden." };
  }

  revalidatePath("/");
  revalidatePath("/workouts");
  redirect(`/workouts/${workout.id}`);
}

export async function deleteWorkout(formData: FormData) {
  const { supabase } = await requireAccess();
  await supabase.from("workouts").delete().eq("id", Number(formData.get("id")));
  revalidatePath("/");
  revalidatePath("/workouts");
  redirect("/workouts");
}
