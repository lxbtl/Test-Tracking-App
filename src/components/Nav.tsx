"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Props = { isAdmin: boolean; name: string; logout: () => Promise<void> };

const links = [
  { href: "/trainingsplan", label: "Trainingsplan" },
  { href: "/workouts", label: "Workouts" },
  { href: "/gesundheit", label: "Gesundheitsdaten" },
];

export default function Nav({ isAdmin, name, logout }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const all = isAdmin ? [...links, { href: "/admin", label: "Admin" }] : links;
  const active = (href: string) => pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/trainingsplan" className="text-lg font-bold text-emerald-700">FitTrack</Link>
        <nav className="hidden items-center gap-1 md:flex">
          {all.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                active(l.href) ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <span className="text-sm text-slate-500">{name}</span>
          <form action={logout}>
            <button className="btn-secondary">Abmelden</button>
          </form>
        </div>
        <button className="btn-secondary md:hidden" onClick={() => setOpen(!open)} aria-label="Menü">
          ☰
        </button>
      </div>
      {open && (
        <nav className="border-t border-slate-200 px-4 py-2 md:hidden">
          {all.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                active(l.href) ? "bg-emerald-50 text-emerald-700" : "text-slate-600"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <form action={logout} className="mt-2 border-t border-slate-100 pt-2">
            <button className="w-full px-3 py-2 text-left text-sm text-slate-600">Abmelden ({name})</button>
          </form>
        </nav>
      )}
    </header>
  );
}
