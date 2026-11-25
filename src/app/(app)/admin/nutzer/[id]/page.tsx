import Link from "next/link";
import { notFound } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { requireAdmin, type Profile } from "@/lib/auth";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: user } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!user) notFound();

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-emerald-700 hover:underline">← Admin-Bereich</Link>
      <div>
        <h1 className="text-2xl font-bold">{user.display_name ?? user.email}</h1>
        <p className="text-sm text-slate-500">
          {user.email} · {user.role === "admin" ? "Admin" : "Nutzer"} ·{" "}
          {user.early_access ? "Early Access" : "Warteliste"}
        </p>
      </div>
      <Dashboard supabase={supabase} userId={user.id} readOnly />
    </div>
  );
}
