import { requireAccess } from "@/lib/auth";
import type { Exercise } from "@/lib/data";
import { today } from "@/lib/format";
import { isWorkoutType } from "@/lib/workout-types";
import WorkoutForm from "./WorkoutForm";

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ typ?: string; plan?: string; datum?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, profile } = await requireAccess();
  // Grundübungen + eigene (auch für Admins nur die eigenen, nicht die aller Nutzer)
  const { data } = await supabase
    .from("exercises")
    .select("id, name, workout_type, owner_id")
    .or(`owner_id.is.null,owner_id.eq.${profile.id}`)
    .order("owner_id", { nullsFirst: true })
    .order("id")
    .returns<Exercise[]>();

  const date = sp.datum && /^\d{4}-\d{2}-\d{2}$/.test(sp.datum) ? sp.datum : today();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Neues Workout</h1>
      <WorkoutForm
        exercises={data ?? []}
        date={date}
        initialType={isWorkoutType(sp.typ) ? sp.typ : null}
        planId={Number(sp.plan) || null}
      />
    </div>
  );
}
