"use server";

import { revalidatePath } from "next/cache";
import { requireAccess } from "@/lib/auth";

export type FormState = { error?: string; ok?: number };

export async function saveWeight(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, profile } = await requireAccess();
  const measured_on = String(formData.get("measured_on") ?? "");
  const weight_kg = Number(String(formData.get("weight_kg") ?? "").replace(",", "."));
  if (!measured_on) return { error: "Bitte wähle ein Datum." };
  if (!Number.isFinite(weight_kg) || weight_kg <= 0 || weight_kg > 500) return { error: "Bitte gib ein gültiges Gewicht ein." };

  const { error } = await supabase
    .from("body_weights")
    .upsert({ user_id: profile.id, measured_on, weight_kg }, { onConflict: "user_id,measured_on" });
  if (error) return { error: "Eintrag konnte nicht gespeichert werden." };

  revalidatePath("/");
  revalidatePath("/gewicht");
  return { ok: Date.now() };
}

export async function deleteWeight(formData: FormData) {
  const { supabase } = await requireAccess();
  await supabase.from("body_weights").delete().eq("id", Number(formData.get("id")));
  revalidatePath("/");
  revalidatePath("/gewicht");
}
