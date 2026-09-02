import { EntitySubmissionsQueue } from "../../features/admin/components/EntitySubmissionsQueue";

export function AdminAcademicsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-bold text-brand-ink">Academics</h1>
      <p className="text-sm text-stone-500">
        Pending professor and course suggestions. Professors/courses are centrally managed — this is
        the only path that creates a new one.
      </p>
      <EntitySubmissionsQueue types={["professor", "course"]} />
    </div>
  );
}
