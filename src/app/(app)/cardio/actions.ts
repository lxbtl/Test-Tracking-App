"use server";

import { revalidatePath } from "next/cache";
import { requireAccess } from "@/lib/auth";

export type FormState = { error?: string; ok?: number };

export async function createCardio(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, profile } = await requireAccess();
  const activity = String(formData.get("activity") ?? "").trim();
  const performed_on = String(formData.get("performed_on") ?? "");
  const distanceRaw = String(formData.get("distance_km") ?? "").replace(",", ".");
  const duration_min = Number(formData.get("duration_min"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!activity) return { error: "Bitte wähle eine Aktivität." };
  if (!performed_on) return { error: "Bitte wähle ein Datum." };
  if (!Number.isFinite(duration_min) || duration_min <= 0) return { error: "Bitte gib eine Dauer in Minuten an." };
  const distance_km = distanceRaw ? Number(distanceRaw) : null;
  if (distance_km != null && (!Number.isFinite(distance_km) || distance_km < 0)) return { error: "Ungültige Distanz." };

  const { error } = await supabase
    .from("cardio_sessions")
    .insert({ user_id: profile.id, activity, performed_on, distance_km, duration_min: Math.round(duration_min), notes });
  if (error) return { error: "Eintrag konnte nicht gespeichert werden." };

  revalidatePath("/");
  revalidatePath("/cardio");
  return { ok: Date.now() };
}

export async function deleteCardio(formData: FormData) {
  const { supabase } = await requireAccess();
  await supabase.from("cardio_sessions").delete().eq("id", Number(formData.get("id")));
  revalidatePath("/");
  revalidatePath("/cardio");
}
