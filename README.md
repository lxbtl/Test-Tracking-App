# FitTrack – Fitness-Tracking-App

Web-App zum Planen und Erfassen von Trainings. Gebaut mit Next.js, TypeScript, Tailwind und Supabase.

- **Startseite:** heutiges Datum, was heute im Plan steht, Wochenfortschritt, wichtigste Kennzahlen,
  Diagramme und ein motivierender Spruch des Tages.
- **Trainingsplan:** Kalender mit Tag-, Wochen- und Monatsansicht. Trainings einplanen (auch wöchentlich
  wiederkehrend) und mit einem Klick starten oder nachtragen.
- **Workouts:** Push-Day, Pull-Day, Leg-Day oder Cardio. Grundübungen zum Anklicken, eigene Übungen pro Nutzer.
  Sätze (1–10, Standard 4) und Wiederholungen (1–12, Standard 10) per Regler, Gewicht per Eingabe.
  Cardio mit Dauer, Distanz und Tempo.
- **Gesundheitsdaten:** Körpergewicht mit Verlauf und BMI-Rechner.

## Rollen und Zugang

- **Early Access:** Nur freigeschaltete Konten können die App nutzen. Alle anderen landen nach der Registrierung auf
  einer Warteseite.
- **Nutzer** sehen und bearbeiten nur ihre eigenen Daten.
- **Admins** sehen alle Nutzer und deren Daten, schalten Early Access frei, verwalten Einladungen und die
  Grundübungen.

Die Regeln werden in der Datenbank per Row Level Security durchgesetzt
(`supabase/migrations/20261125190000_init_schema.sql`), nicht nur in der Oberfläche.

## Lokal starten

Voraussetzungen: Node.js 20+ und Docker (z. B. Docker Desktop) muss laufen.
Auf dem Mac liegt der `docker`-Befehl von Docker Desktop teils unter `~/.docker/bin`. Falls „docker not found“
erscheint, vorher `export PATH="$HOME/.docker/bin:$PATH"` ausführen.

```bash
npm install
npm run db:start        # startet Supabase lokal in Docker (beim ersten Mal dauert der Download etwas)
npm run db:reset        # legt Tabellen an und spielt die Testdaten ein
cp .env.example .env.local
# In .env.local den PUBLISHABLE_KEY aus `npm run db:status` eintragen
npm run dev
```

Dann <http://localhost:3000> öffnen. Supabase Studio (Datenbank-Oberfläche) läuft unter <http://127.0.0.1:54323>.

### Test-Zugänge (nur lokal, Platzhalter-Passwörter)

| E-Mail                | Passwort    | Rolle | Early Access |
| --------------------- | ----------- | ----- | ------------ |
| `admin@fitness.local` | `Admin123!` | Admin | ja           |
| `anna@fitness.local`  | `Test1234!` | Nutzer | ja          |
| `ben@fitness.local`   | `Test1234!` | Nutzer | ja          |
| `carla@fitness.local` | `Test1234!` | Nutzer | nein (Warteliste) |

Die Testdaten (`supabase/seed.sql`) enthalten 8 Wochen Workouts (Push, Pull, Leg, Cardio), einen Trainingsplan
für die nächsten 3 Wochen und Gewichtswerte für Admin, Anna und Ben. Anna hat zusätzlich eine eigene Übung. `npm run db:reset` setzt die lokale Datenbank jederzeit auf diesen Stand zurück.

> Diese Zugänge sind nur für die lokale Entwicklung. Die Seed-Datei darf nie gegen eine echte Datenbank
> ausgeführt werden.

## Projektstruktur

```
src/app/login          Anmeldung und Registrierung
src/app/warteliste     Seite für Konten ohne Early Access
src/app/(app)/         Geschützter Bereich: Trainingsplan, Workouts, Gesundheitsdaten, Admin
src/components         Navigation, Dashboard, Diagramme
src/lib                Supabase-Clients, Auth-Helfer, Datenabfragen
supabase/migrations    Datenbankschema und Zugriffsregeln
supabase/seed.sql      Admin-User und Testdaten
```
