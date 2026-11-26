"use server";

import { revalidatePath } from "next/cache";
import { requireAccess } from "@/lib/auth";
import { isWorkoutType, TYPE_META } from "@/lib/workout-types";

export type PlanState = { error?: string; ok?: number };

export async function addPlan(_prev: PlanState, formData: FormData): Promise<PlanState> {
  const { supabase, profile } = await requireAccess();
  const planned_on = String(formData.get("planned_on") ?? "");
  const workout_type = formData.get("workout_type");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const repeat = Math.min(12, Math.max(1, Number(formData.get("repeat_weeks") ?? 1) || 1));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(planned_on)) return { error: "Bitte wähle ein Datum." };
  if (!isWorkoutType(workout_type)) return { error: "Bitte wähle eine Trainingsart." };
  const title = String(formData.get("title") ?? "").trim() || TYPE_META[workout_type].label;

  const rows = Array.from({ length: repeat }, (_, i) => {
    const d = new Date(planned_on + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + i * 7);
    return { user_id: profile.id, planned_on: d.toISOString().slice(0, 10), workout_type, title, notes };
  });
  const { error } = await supabase.from("planned_workouts").insert(rows);
  if (error) return { error: "Training konnte nicht eingeplant werden." };
  revalidatePath("/trainingsplan");
  return { ok: Date.now() };
}

export async function deletePlan(formData: FormData) {
  const { supabase } = await requireAccess();
  await supabase.from("planned_workouts").delete().eq("id", Number(formData.get("id")));
  revalidatePath("/trainingsplan");
}
