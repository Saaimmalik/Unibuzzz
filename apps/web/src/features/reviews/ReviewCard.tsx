import type { ReviewPublic, ReviewTargetType } from "@unibuzzz/shared";
import { formatRelativeTime } from "@unibuzzz/shared";
import { Flag, ThumbsUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { ReportReviewModal } from "./ReportReviewModal";
import { StarRating } from "./StarRating";
import { useRemoveOwnReview, useToggleReviewHelpful } from "./hooks";

const STATUS_LABELS: Record<string, string> = {
  hidden: "Hidden pending moderator review",
};

const DIFFICULTY_LABELS = ["", "Very easy", "Easy", "Moderate", "Hard", "Very hard"];
const WORKLOAD_LABELS = ["", "Very light", "Light", "Moderate", "Heavy", "Very heavy"];

export function ReviewCard({
  review,
  targetType,
  targetId,
  professorNames = {},
}: {
  review: ReviewPublic;
  targetType: ReviewTargetType;
  targetId: string;
  // Course reviews only — id -> "First Last", for the "Taught by" tag.
  professorNames?: Record<string, string>;
}) {
  const { appUser } = useAuth();
  const toggleHelpful = useToggleReviewHelpful(targetType, targetId);
  const removeReview = useRemoveOwnReview(targetType, targetId);
  const [isReporting, setIsReporting] = useState(false);

  const statusNote = review.status !== "visible" ? STATUS_LABELS[review.status] : null;

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <StarRating value={review.rating} />
          <p className="mt-1 text-xs text-stone-500">
            Verified Student · {formatRelativeTime(review.created_at)}
          </p>
        </div>
        {review.is_own && (
          <button
            type="button"
            onClick={() => removeReview.mutate(review.id)}
            disabled={removeReview.isPending}
            className="rounded-full p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Remove your review"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {statusNote && (
        <p className="mt-2 rounded-lg bg-brand-yellow/10 px-2.5 py-1 text-xs font-medium text-brand-orange">
          {statusNote}
        </p>
      )}

      {review.title && <p className="mt-2 text-sm font-semibold text-brand-ink">{review.title}</p>}
      <p className="mt-1 whitespace-pre-wrap text-sm text-brand-ink">{review.body}</p>

      {(review.interest_rating || review.difficulty_rating || review.workload_rating) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {review.interest_rating !== null && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
              Interest {review.interest_rating}/5
            </span>
          )}
          {review.difficulty_rating !== null && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
              {DIFFICULTY_LABELS[review.difficulty_rating]}
            </span>
          )}
          {review.workload_rating !== null && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
              {WORKLOAD_LABELS[review.workload_rating]} workload
            </span>
          )}
        </div>
      )}

      {review.taught_by_professor_id && review.teaching_rating !== null && (
        <p className="mt-2 text-xs text-stone-500">
          Taught by{" "}
          <span className="font-medium text-brand-ink">
            {professorNames[review.taught_by_professor_id] ?? "a listed professor"}
          </span>{" "}
          · rated {review.teaching_rating}/5 for teaching
        </p>
      )}

      {review.alternate_professor_name && (
        <p className="mt-2 text-xs text-stone-500">
          Taught by{" "}
          <span className="font-medium text-brand-ink">{review.alternate_professor_name}</span>{" "}
          <span className="text-stone-400">(not listed for this module)</span>
          {review.teaching_rating !== null && ` · rated ${review.teaching_rating}/5 for teaching`}
        </p>
      )}

      {review.would_recommend !== null && (
        <p className="mt-2 text-xs font-medium text-stone-500">
          {review.would_recommend ? "Would recommend" : "Would not recommend"}
        </p>
      )}

      {review.status === "visible" && (
        <div className="mt-3 flex items-center gap-4 border-t border-stone-100 pt-2">
          <button
            type="button"
            onClick={() =>
              toggleHelpful.mutate({ reviewId: review.id, currentlyVoted: review.viewer_has_voted })
            }
            disabled={review.is_own || toggleHelpful.isPending}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
              review.viewer_has_voted
                ? "text-brand-purple"
                : "text-stone-500 hover:text-brand-purple"
            }`}
          >
            <ThumbsUp size={14} fill={review.viewer_has_voted ? "currentColor" : "none"} />
            Helpful{review.helpful_count > 0 ? ` (${review.helpful_count})` : ""}
          </button>

          {!review.is_own && appUser && (
            <button
              type="button"
              onClick={() => setIsReporting(true)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-stone-500 hover:text-red-600"
            >
              <Flag size={14} />
              Report
            </button>
          )}
        </div>
      )}

      {isReporting && (
        <ReportReviewModal reviewId={review.id} onClose={() => setIsReporting(false)} />
      )}
    </article>
  );
}
