"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string };

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen." };
  redirect("/");
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Das Passwort muss mindestens 8 Zeichen lang sein." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password,
    options: { data: { display_name: String(formData.get("display_name") ?? "").trim() || undefined } },
  });
  if (error) return { error: "Registrierung fehlgeschlagen: " + error.message };
  if (!data.session) return { info: "Bitte bestätige deine E-Mail-Adresse und melde dich dann an." };
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
