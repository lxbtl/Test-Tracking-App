"use client";

import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(login, {});
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signup, {});
  const state = mode === "login" ? loginState : signupState;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-emerald-700">FitTrack</h1>
        <p className="mb-6 text-sm text-slate-500">Dein Fitness-Tagebuch (Early Access)</p>

        <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-md py-1.5 ${mode === "login" ? "bg-white shadow-sm" : "text-slate-500"}`}
          >
            Anmelden
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-md py-1.5 ${mode === "signup" ? "bg-white shadow-sm" : "text-slate-500"}`}
          >
            Registrieren
          </button>
        </div>

        <form action={mode === "login" ? loginAction : signupAction} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="label" htmlFor="display_name">Name</label>
              <input className="input" id="display_name" name="display_name" autoComplete="name" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">E-Mail</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Passwort</label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          {state.error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{state.error}</p>}
          {state.info && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{state.info}</p>}
          <button className="btn w-full" disabled={loginPending || signupPending}>
            {mode === "login" ? "Anmelden" : "Konto erstellen"}
          </button>
        </form>
        {mode === "signup" && (
          <p className="mt-4 text-xs text-slate-500">
            Die App ist im Early Access. Nach der Registrierung kannst du sie nutzen, sobald deine E-Mail-Adresse
            freigeschaltet ist.
          </p>
        )}
      </div>
    </main>
  );
}
