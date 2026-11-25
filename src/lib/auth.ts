import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  role: "user" | "admin";
  early_access: boolean;
  created_at: string;
};

/** Angemeldeten Nutzer + Profil laden; leitet um, wenn nicht angemeldet. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect("/login");

  return { supabase, user, profile };
}

/** Wie requireUser, verlangt aber Early Access (oder Admin). */
export async function requireAccess() {
  const ctx = await requireUser();
  if (!ctx.profile.early_access && ctx.profile.role !== "admin") redirect("/warteliste");
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireAccess();
  if (ctx.profile.role !== "admin") redirect("/");
  return ctx;
}
