import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { logout } from "../login/actions";

export default async function WaitlistPage() {
  const { profile } = await requireUser();
  if (profile.early_access || profile.role === "admin") redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md text-center">
        <div className="mb-3 text-4xl">⏳</div>
        <h1 className="mb-2 text-xl font-bold">Du stehst auf der Warteliste</h1>
        <p className="mb-6 text-sm text-slate-600">
          Hallo {profile.display_name ?? profile.email}! FitTrack ist derzeit nur mit Early Access nutzbar. Sobald
          ein Admin dein Konto ({profile.email}) freischaltet, kannst du loslegen.
        </p>
        <form action={logout}>
          <button className="btn-secondary">Abmelden</button>
        </form>
      </div>
    </main>
  );
}
