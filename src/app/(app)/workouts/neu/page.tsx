import { requireAccess } from "@/lib/auth";
import { today } from "@/lib/format";
import WorkoutForm from "./WorkoutForm";

export default async function NewWorkoutPage() {
  const { supabase } = await requireAccess();
  const { data: exercises } = await supabase.from("exercises").select("id, name, muscle_group").order("name");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Neues Workout</h1>
      {exercises && exercises.length > 0 ? (
        <WorkoutForm exercises={exercises} today={today()} />
      ) : (
        <div className="card text-sm text-slate-500">Es sind noch keine Übungen angelegt. Ein Admin kann sie im Admin-Bereich hinzufügen.</div>
      )}
    </div>
  );
}
