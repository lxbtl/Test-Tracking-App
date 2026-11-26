"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isWorkoutType } from "@/lib/workout-types";

export async function setEarlyAccess(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("profiles")
    .update({ early_access: formData.get("value") === "true" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin");
}

export async function setRole(formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const id = String(formData.get("id"));
  if (id === profile.id) return; // eigene Admin-Rolle nicht entziehen
  const role = formData.get("value") === "admin" ? "admin" : "user";
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/admin");
}

export async function addInvite(formData: FormData) {
  const { supabase } = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return;
  const note = String(formData.get("note") ?? "").trim() || null;
  await supabase.from("early_access_invites").upsert({ email, note });
  revalidatePath("/admin");
}

export async function removeInvite(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("early_access_invites").delete().eq("email", String(formData.get("email")));
  revalidatePath("/admin");
}

export async function addExercise(formData: FormData) {
  const { supabase } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const workout_type = String(formData.get("workout_type") ?? "");
  if (!isWorkoutType(workout_type)) return;
  // owner_id null = Grundübung für alle Nutzer
  await supabase.from("exercises").insert({ name, workout_type, owner_id: null });
  revalidatePath("/admin");
}

export async function deleteExercise(formData: FormData) {
  const { supabase } = await requireAdmin();
  // Schlägt fehl, wenn die Übung bereits in Sätzen verwendet wird (Fremdschlüssel) – gewollt.
  await supabase.from("exercises").delete().eq("id", Number(formData.get("id")));
  revalidatePath("/admin");
}
