import { Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ReviewCard } from "../features/reviews/ReviewCard";
import { ReviewForm } from "../features/reviews/ReviewForm";
import { StarRating } from "../features/reviews/StarRating";
import { useProfessor, useReviews } from "../features/reviews/hooks";

export function ProfessorPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: professor, isLoading } = useProfessor(slug ?? "");
  const { reviews, ownReview, isLoading: reviewsLoading } = useReviews(
    "professor",
    professor?.id ?? "",
  );
  const [isWriting, setIsWriting] = useState(false);

  if (isLoading) return <p className="py-10 text-center text-sm text-stone-400">Loading…</p>;
  if (!professor)
    return <p className="py-10 text-center text-sm text-stone-400">Professor not found.</p>;

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <h1 className="text-lg font-bold text-brand-ink">
          {professor.first_name} {professor.last_name}
        </h1>
        <p className="text-sm text-stone-500">{professor.department}</p>
        <div className="mt-2 flex items-center gap-2">
          <StarRating value={professor.avg_rating} />
          <span className="text-sm font-semibold text-brand-ink">
            {professor.avg_rating.toFixed(1)}
          </span>
          <span className="text-xs text-stone-400">({professor.review_count} reviews)</span>
        </div>

        {professor.professor_courses.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Courses taught
            </p>
            <div className="flex flex-wrap gap-1.5">
              {professor.professor_courses.map(({ course }) => (
                <Link
                  key={course.id}
                  to={`/reviews/courses/${course.slug}`}
                  className="rounded-full bg-brand-purple/10 px-2.5 py-1 text-xs font-medium text-brand-purple hover:bg-brand-purple/20"
                >
                  {course.code} — {course.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {!ownReview && !isWriting && (
        <button
          type="button"
          onClick={() => setIsWriting(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black hover:bg-brand-orange"
        >
          <Plus size={16} />
          Write a review
        </button>
      )}

      {isWriting && (
        <ReviewForm targetType="professor" targetId={professor.id} onDone={() => setIsWriting(false)} />
      )}

      <div className="space-y-3">
        {reviewsLoading && <p className="text-sm text-stone-400">Loading reviews…</p>}
        {!reviewsLoading && reviews.length === 0 && (
          <p className="py-6 text-center text-sm text-stone-400">
            No reviews yet — be the first to share your experience.
          </p>
        )}
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} targetType="professor" targetId={professor.id} />
        ))}
      </div>
    </div>
  );
}
