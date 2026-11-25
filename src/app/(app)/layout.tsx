import Nav from "@/components/Nav";
import { requireAccess } from "@/lib/auth";
import { logout } from "../login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAccess();
  return (
    <>
      <Nav isAdmin={profile.role === "admin"} name={profile.display_name ?? profile.email} logout={logout} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </>
  );
}
