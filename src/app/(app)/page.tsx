import Link from "next/link";
import Dashboard from "@/components/Dashboard";
import { requireAccess } from "@/lib/auth";

export default async function HomePage() {
  const { supabase, profile } = await requireAccess();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hallo {profile.display_name ?? ""} 👋</h1>
          <p className="text-sm text-slate-500">Dein Fortschritt der letzten Wochen</p>
        </div>
        <div className="flex gap-2">
          <Link href="/workouts/neu" className="btn">+ Workout</Link>
          <Link href="/cardio" className="btn-secondary">+ Cardio</Link>
          <Link href="/gewicht" className="btn-secondary">+ Gewicht</Link>
        </div>
      </div>
      <Dashboard supabase={supabase} userId={profile.id} />
    </div>
  );
}
