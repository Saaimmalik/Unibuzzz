import { formatRelativeTime, type AssessmentComponent } from "@unibuzzz/shared";
import { ExternalLink, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ReviewCard } from "../features/reviews/ReviewCard";
import { ReviewForm } from "../features/reviews/ReviewForm";
import { StarRating } from "../features/reviews/StarRating";
import { type ReviewSort } from "../features/reviews/api";
import { useCourse, useCourseTeachingRatings, useReviews } from "../features/reviews/hooks";

function MetricBar({
  label,
  value,
  endLabels,
  colorClass = "bg-brand-yellow",
}: {
  label: string;
  value: number;
  endLabels?: [string, string];
  colorClass?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium text-stone-600">
        <span>{label}</span>
        <span className="font-semibold text-brand-ink">{value > 0 ? value.toFixed(1) : "—"}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-stone-100">
        <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      {endLabels && (
        <div className="mt-0.5 flex justify-between text-[10px] text-stone-400">
          <span>{endLabels[0]}</span>
          <span>{endLabels[1]}</span>
        </div>
      )}
    </div>
  );
}

function AssessmentBar({ item }: { item: AssessmentComponent }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-brand-ink">{item.type}</span>
        <span className="font-semibold text-brand-purple">{item.weight_pct}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-stone-100">
        <div className="h-2 rounded-full bg-brand-purple" style={{ width: `${item.weight_pct}%` }} />
      </div>
      {item.detail && <p className="mt-0.5 text-xs text-stone-400">{item.detail}</p>}
    </div>
  );
}

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: "recent", label: "Most Recent" },
  { value: "highest_rated", label: "Highest Rated" },
  { value: "most_helpful", label: "Most Helpful" },
];

export function CoursePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: course, isLoading } = useCourse(slug ?? "");
  const [sort, setSort] = useState<ReviewSort>("recent");
  const { reviews, ownReview, isLoading: reviewsLoading } = useReviews(
    "course",
    course?.id ?? "",
    sort,
  );
  const { data: teachingRatings } = useCourseTeachingRatings(course?.id ?? "");
  const [isWriting, setIsWriting] = useState(false);

  const professorNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const { professor } of course?.professor_courses ?? []) {
      map[professor.id] = `${professor.first_name} ${professor.last_name}`;
    }
    return map;
  }, [course]);

  const teachingByProfessorId = useMemo(() => {
    const map = new Map(teachingRatings?.map((t) => [t.professor_id, t]) ?? []);
    return map;
  }, [teachingRatings]);

  if (isLoading) return <p className="py-10 text-center text-sm text-stone-400">Loading…</p>;
  if (!course) return <p className="py-10 text-center text-sm text-stone-400">Course not found.</p>;

  const hasAssessment = course.assessment_breakdown.length > 0;
  const hasOfficialDetails =
    course.credits ||
    course.student_effort_hours ||
    course.delivery ||
    course.level ||
    course.grading ||
    course.learning_outcomes ||
    course.teaching_methods;
  const latestReview = reviews.find((r) => r.status === "visible");

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-yellow/20 px-2.5 py-1 text-xs font-bold text-brand-ink">
              {course.code}
            </span>
            {course.level && (
              <span className="rounded-full border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-500">
                {course.level}
              </span>
            )}
          </div>
          {course.source_url && (
            <a
              href={course.source_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-brand-purple hover:underline"
            >
              View in UCD catalogue
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        <h1 className="mt-2 text-lg font-bold text-brand-ink">{course.title}</h1>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          <span>{course.department}</span>
          {course.professor_courses.length > 0 && (
            <span>
              {course.professor_courses
                .map((pc) => `${pc.professor.first_name} ${pc.professor.last_name}`)
                .join(", ")}
            </span>
          )}
          {course.credits && <span>{course.credits} credits</span>}
        </div>

        {course.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-stone-600">{course.description}</p>
        )}
      </div>

      {/* Ratings summary */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-extrabold text-brand-ink">{course.avg_rating.toFixed(1)}</p>
            <StarRating value={course.avg_rating} />
          </div>
          <p className="text-right text-xs text-stone-400">
            {course.review_count} review{course.review_count === 1 ? "" : "s"}
            {latestReview && (
              <>
                <br />
                latest {formatRelativeTime(latestReview.created_at)}
              </>
            )}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
          <MetricBar label="Interest" value={course.avg_interest} colorClass="bg-brand-yellow" />
          <MetricBar
            label="Difficulty"
            value={course.avg_difficulty}
            endLabels={["Very easy", "Very hard"]}
            colorClass="bg-brand-purple"
          />
          <MetricBar label="Workload" value={course.avg_workload} colorClass="bg-brand-orange" />
          <div>
            <p className="text-xs font-medium text-stone-600">Would recommend</p>
            <p className="mt-1 text-xl font-bold text-brand-ink">
              {course.would_recommend_pct !== null ? `${Math.round(course.would_recommend_pct)}%` : "—"}
            </p>
          </div>
        </div>

        {!ownReview && !isWriting && (
          <button
            type="button"
            onClick={() => setIsWriting(true)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black hover:bg-brand-orange"
          >
            <Plus size={16} />
            Write a review
          </button>
        )}
      </div>

      {isWriting && (
        <ReviewForm
          targetType="course"
          targetId={course.id}
          courseProfessors={course.professor_courses.map((pc) => pc.professor)}
          onDone={() => setIsWriting(false)}
        />
      )}

      {/* Assessment breakdown */}
      {hasAssessment && (
        <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-bold text-brand-ink">How you're assessed</h2>
          {course.assessment_breakdown.map((item, i) => (
            <AssessmentBar key={i} item={item} />
          ))}
        </div>
      )}

      {/* Who teaches it */}
      {course.professor_courses.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-bold text-brand-ink">Who teaches it</h2>
          <p className="text-xs text-stone-400">
            Named by students in their reviews. These ratings cover this module only, and don't count
            towards the professor's overall score.
          </p>
          {course.professor_courses.map(({ professor, is_coordinator }) => {
            const teaching = teachingByProfessorId.get(professor.id);
            return (
              <Link
                key={professor.id}
                to={`/reviews/professors/${professor.slug}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 p-2.5 hover:border-brand-purple/40"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-brand-ink">
                    {professor.title ? `${professor.title} ` : ""}
                    {professor.first_name} {professor.last_name}
                  </span>
                  {is_coordinator && (
                    <span className="rounded-full border border-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                      Module coordinator
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-stone-500">
                  {teaching
                    ? `${teaching.avg_teaching.toFixed(1)}/5 teaching · ${teaching.rating_count} rating${teaching.rating_count === 1 ? "" : "s"}`
                    : "No teaching ratings yet"}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Official details */}
      {hasOfficialDetails && (
        <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-bold text-brand-ink">Official details</h2>
          {course.student_effort_hours && (
            <p className="text-xs text-stone-500">
              <span className="font-semibold text-brand-ink">{course.student_effort_hours} hours</span>{" "}
              of student effort
            </p>
          )}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {course.delivery && (
              <div className="rounded-lg bg-stone-50 p-2">
                <p className="text-[10px] font-semibold uppercase text-stone-400">Delivery</p>
                <p className="mt-0.5 font-medium text-brand-ink">{course.delivery}</p>
              </div>
            )}
            {course.level && (
              <div className="rounded-lg bg-stone-50 p-2">
                <p className="text-[10px] font-semibold uppercase text-stone-400">Level</p>
                <p className="mt-0.5 font-medium text-brand-ink">{course.level}</p>
              </div>
            )}
            {course.grading && (
              <div className="rounded-lg bg-stone-50 p-2">
                <p className="text-[10px] font-semibold uppercase text-stone-400">Grading</p>
                <p className="mt-0.5 font-medium text-brand-ink">{course.grading}</p>
              </div>
            )}
          </div>
          {course.learning_outcomes && (
            <details className="rounded-lg border border-stone-100 p-2.5">
              <summary className="cursor-pointer text-sm font-medium text-brand-ink">
                Learning outcomes
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-xs text-stone-500">
                {course.learning_outcomes}
              </p>
            </details>
          )}
          {course.teaching_methods && (
            <details className="rounded-lg border border-stone-100 p-2.5">
              <summary className="cursor-pointer text-sm font-medium text-brand-ink">
                Teaching and learning methods
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-xs text-stone-500">
                {course.teaching_methods}
              </p>
            </details>
          )}
        </div>
      )}

      {/* Reviews */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-brand-ink">Reviews ({course.review_count})</h2>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ReviewSort)}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-600 focus:border-brand-purple focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {reviewsLoading && <p className="text-sm text-stone-400">Loading reviews…</p>}
        {!reviewsLoading && reviews.length === 0 && (
          <p className="py-6 text-center text-sm text-stone-400">
            No reviews yet — be the first to share your experience.
          </p>
        )}
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              targetType="course"
              targetId={course.id}
              professorNames={professorNames}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
