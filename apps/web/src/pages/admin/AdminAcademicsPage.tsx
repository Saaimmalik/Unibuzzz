import { formatRelativeTime } from "@unibuzzz/shared";
import { useState } from "react";
import { EntitySubmissionsQueue } from "../../features/admin/components/EntitySubmissionsQueue";
import { useAlternateTeacherMentions } from "../../features/admin/hooks";

function tabClasses(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-semibold ${
    active ? "bg-brand-purple/10 text-brand-purple" : "text-stone-500 hover:bg-stone-100"
  }`;
}

function TeacherMentionsTab() {
  const { data: mentions, isLoading } = useAlternateTeacherMentions();

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        Read-only — course reviewers named these people as "who taught you?" instead of picking a
        professor already linked to the module. If several reviews independently name the same
        person for the same module, professor_courses probably needs updating (link an existing
        professor, or suggest a new one via Reviews' "Suggest entry").
      </p>
      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {mentions?.map((m) => (
          <li key={`${m.course_id}-${m.mentioned_name.toLowerCase()}`} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-ink">{m.mentioned_name}</p>
                <p className="text-xs text-stone-500">
                  {m.course_code} · {m.course_title}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-brand-yellow/20 px-2 py-1 text-xs font-semibold text-brand-ink">
                {m.mention_count} {m.mention_count === 1 ? "mention" : "mentions"}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-400">
              Last mentioned {formatRelativeTime(m.latest_mentioned_at)}
            </p>
          </li>
        ))}
        {mentions?.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-stone-400">
            No alternate teacher mentions.
          </li>
        )}
      </ul>
    </div>
  );
}

export function AdminAcademicsPage() {
  const [tab, setTab] = useState<"suggestions" | "mentions">("suggestions");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-bold text-brand-ink">Academics</h1>
      <div className="flex w-fit gap-1 rounded-full bg-stone-100 p-1">
        <button
          type="button"
          onClick={() => setTab("suggestions")}
          className={tabClasses(tab === "suggestions")}
        >
          Suggestions
        </button>
        <button
          type="button"
          onClick={() => setTab("mentions")}
          className={tabClasses(tab === "mentions")}
        >
          Teacher mentions
        </button>
      </div>

      {tab === "suggestions" ? (
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            Pending professor and course suggestions. Professors/courses are centrally managed —
            this is the only path that creates a new one.
          </p>
          <EntitySubmissionsQueue types={["professor", "course"]} />
        </div>
      ) : (
        <TeacherMentionsTab />
      )}
    </div>
  );
}
