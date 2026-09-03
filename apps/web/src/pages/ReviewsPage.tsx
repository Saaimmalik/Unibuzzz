import type { Course, Professor } from "@unibuzzz/shared";
import { GraduationCap, Plus, Search as SearchIcon, User } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { StarRating } from "../features/reviews/StarRating";
import { SuggestEntryModal } from "../features/reviews/SuggestEntryModal";
import {
  useCourseSearch,
  useMostReviewedCourses,
  useMostReviewedProfessors,
  useProfessorSearch,
  useTrendingCourses,
  useTrendingProfessors,
} from "../features/reviews/hooks";
import { useDebouncedValue } from "../lib/useDebouncedValue";

function ProfessorRow({ professor }: { professor: Professor }) {
  return (
    <Link
      to={`/reviews/professors/${professor.slug}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 hover:border-brand-purple/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-brand-ink">
          {professor.first_name} {professor.last_name}
        </p>
        <p className="truncate text-xs text-stone-500">{professor.department}</p>
      </div>
      <div className="shrink-0 text-right">
        <StarRating value={professor.avg_rating} />
        <p className="mt-0.5 text-xs text-stone-400">{professor.review_count} reviews</p>
      </div>
    </Link>
  );
}

function CourseRow({ course }: { course: Course }) {
  return (
    <Link
      to={`/reviews/courses/${course.slug}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 hover:border-brand-purple/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-brand-ink">{course.code}</p>
        <p className="truncate text-xs text-stone-500">{course.title}</p>
      </div>
      <div className="shrink-0 text-right">
        <StarRating value={course.avg_rating} />
        <p className="mt-0.5 text-xs text-stone-400">{course.review_count} reviews</p>
      </div>
    </Link>
  );
}

export function ReviewsPage() {
  const [entityType, setEntityType] = useState<"professor" | "course">("professor");
  const [query, setQuery] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);

  const trendingProfessors = useTrendingProfessors(6);
  const mostReviewedProfessors = useMostReviewedProfessors(6);
  const trendingCourses = useTrendingCourses(6);
  const mostReviewedCourses = useMostReviewedCourses(6);
  const professorResults = useProfessorSearch(entityType === "professor" ? debouncedQuery : "");
  const courseResults = useCourseSearch(entityType === "course" ? debouncedQuery : "");

  const hasQuery = debouncedQuery.trim().length >= 2;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-brand-ink">Reviews</h1>
        <button
          type="button"
          onClick={() => setIsSuggesting(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-yellow px-3 py-1.5 text-sm font-semibold text-black hover:bg-brand-orange"
        >
          <Plus size={16} />
          Suggest entry
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEntityType("professor")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${entityType === "professor" ? "bg-brand-ink text-white" : "text-stone-500 hover:bg-stone-100"}`}
        >
          <User size={15} />
          Professors
        </button>
        <button
          type="button"
          onClick={() => setEntityType("course")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${entityType === "course" ? "bg-brand-ink text-white" : "text-stone-500 hover:bg-stone-100"}`}
        >
          <GraduationCap size={15} />
          Courses
        </button>
      </div>

      <div className="relative">
        <SearchIcon
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={entityType === "professor" ? "Search professors…" : "Search courses…"}
          className="w-full rounded-full border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
        />
      </div>

      {hasQuery ? (
        <section className="space-y-2">
          {entityType === "professor" ? (
            <>
              {professorResults.isLoading && <p className="text-sm text-stone-400">Searching…</p>}
              {!professorResults.isLoading && professorResults.data?.length === 0 && (
                <p className="text-sm text-stone-400">No professors found. Suggest one above.</p>
              )}
              {professorResults.data?.map((p) => (
                <ProfessorRow key={p.id} professor={p} />
              ))}
            </>
          ) : (
            <>
              {courseResults.isLoading && <p className="text-sm text-stone-400">Searching…</p>}
              {!courseResults.isLoading && courseResults.data?.length === 0 && (
                <p className="text-sm text-stone-400">No courses found. Suggest one above.</p>
              )}
              {courseResults.data?.map((c) => (
                <CourseRow key={c.id} course={c} />
              ))}
            </>
          )}
        </section>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-stone-500">Trending</h2>
            {entityType === "professor"
              ? trendingProfessors.data?.map((p) => <ProfessorRow key={p.id} professor={p} />)
              : trendingCourses.data?.map((c) => <CourseRow key={c.id} course={c} />)}
            {entityType === "professor" && trendingProfessors.data?.length === 0 && (
              <p className="text-sm text-stone-400">No trending professors yet.</p>
            )}
            {entityType === "course" && trendingCourses.data?.length === 0 && (
              <p className="text-sm text-stone-400">No trending courses yet.</p>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-stone-500">Most reviewed</h2>
            {entityType === "professor"
              ? mostReviewedProfessors.data?.map((p) => <ProfessorRow key={p.id} professor={p} />)
              : mostReviewedCourses.data?.map((c) => <CourseRow key={c.id} course={c} />)}
          </section>
        </>
      )}

      {isSuggesting && <SuggestEntryModal onClose={() => setIsSuggesting(false)} />}
    </div>
  );
}
