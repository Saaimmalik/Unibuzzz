import type {
  Course,
  CourseTeachingRating,
  CourseWithProfessors,
  Professor,
  ProfessorWithCourses,
  Review,
  ReviewReportReason,
  ReviewTargetType,
} from "@unibuzzz/shared";
import { toIlikePattern } from "../../lib/search";
import { supabase } from "../../lib/supabase";

// Explicit column list, never including reviewer_id — see the comment on
// ReviewPublic in packages/shared/src/types.ts. "Own review" and "has the
// viewer voted" are resolved via separate, narrowly-filtered queries (below)
// rather than by selecting reviewer_id here.
const REVIEW_PUBLIC_SELECT =
  "id,university_id,target_type,target_id,rating,title,body,tags,would_recommend,helpful_count,status,flagged_pii,interest_rating,difficulty_rating,workload_rating,teaching_rating,taught_by_professor_id,alternate_professor_name,created_at";

export type ReviewRow = Omit<Review, "reviewer_id">;
export type ReviewSort = "recent" | "highest_rated" | "most_helpful";

// .gt(...) matters here, not just cosmetics: without it these rails would
// backfill with arbitrary zero-review rows (Postgres's unspecified tie order
// over review_count/trending_score = 0) up to `limit` any time fewer than
// `limit` entities actually have a review — which, pre-launch, is most of
// the time. That reads as "trending/most-reviewed isn't showing the actual
// leaders" even though the ordering itself is correct.
export async function fetchTrendingProfessors(limit = 10): Promise<Professor[]> {
  const { data, error } = await supabase
    .from("professors")
    .select("*")
    .is("merged_into_id", null)
    .gt("trending_score", 0)
    .order("trending_score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMostReviewedProfessors(limit = 10): Promise<Professor[]> {
  const { data, error } = await supabase
    .from("professors")
    .select("*")
    .is("merged_into_id", null)
    .gt("review_count", 0)
    .order("review_count", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTrendingCourses(limit = 10): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .is("merged_into_id", null)
    .gt("trending_score", 0)
    .order("trending_score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMostReviewedCourses(limit = 10): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .is("merged_into_id", null)
    .gt("review_count", 0)
    .order("review_count", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Three single-column queries merged client-side, same reasoning as
// features/search/api.ts's searchUsers: avoids .or()-filter injection from
// a query containing commas/parentheses.
export async function searchProfessors(query: string): Promise<Professor[]> {
  const pattern = toIlikePattern(query);
  const [byFirst, byLast, byDept] = await Promise.all([
    supabase
      .from("professors")
      .select("*")
      .is("merged_into_id", null)
      .ilike("first_name", pattern)
      .limit(15),
    supabase
      .from("professors")
      .select("*")
      .is("merged_into_id", null)
      .ilike("last_name", pattern)
      .limit(15),
    supabase
      .from("professors")
      .select("*")
      .is("merged_into_id", null)
      .ilike("department", pattern)
      .limit(15),
  ]);

  const byId = new Map<string, Professor>();
  for (const result of [byFirst, byLast, byDept]) {
    if (result.error) throw result.error;
    for (const row of result.data ?? []) byId.set(row.id, row);
  }
  return [...byId.values()].slice(0, 20);
}

export async function searchCourses(query: string): Promise<Course[]> {
  const pattern = toIlikePattern(query);
  const [byCode, byTitle, byDept] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .is("merged_into_id", null)
      .ilike("code", pattern)
      .limit(15),
    supabase
      .from("courses")
      .select("*")
      .is("merged_into_id", null)
      .ilike("title", pattern)
      .limit(15),
    supabase
      .from("courses")
      .select("*")
      .is("merged_into_id", null)
      .ilike("department", pattern)
      .limit(15),
  ]);

  const byId = new Map<string, Course>();
  for (const result of [byCode, byTitle, byDept]) {
    if (result.error) throw result.error;
    for (const row of result.data ?? []) byId.set(row.id, row);
  }
  return [...byId.values()].slice(0, 20);
}

export async function fetchProfessorBySlug(slug: string): Promise<ProfessorWithCourses | null> {
  const { data, error } = await supabase
    .from("professors")
    .select("*, professor_courses(is_coordinator, course:courses(id,code,title,slug))")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as ProfessorWithCourses | null;
}

export async function fetchCourseBySlug(slug: string): Promise<CourseWithProfessors | null> {
  const { data, error } = await supabase
    .from("courses")
    .select(
      "*, professor_courses(is_coordinator, professor:professors(id,first_name,last_name,slug,title))",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as CourseWithProfessors | null;
}

// Teaching ratings scoped to this specific module (see course_teaching_ratings
// in 20260902270500_course_review_detail.sql) — deliberately separate from a
// professor's own overall avg_rating on their professor page.
export async function fetchCourseTeachingRatings(
  courseId: string,
): Promise<CourseTeachingRating[]> {
  const { data, error } = await supabase.rpc("course_teaching_ratings", { p_course_id: courseId });
  if (error) throw error;
  return data ?? [];
}

const SORT_COLUMNS: Record<ReviewSort, { column: string; ascending: boolean }> = {
  recent: { column: "created_at", ascending: false },
  highest_rated: { column: "rating", ascending: false },
  most_helpful: { column: "helpful_count", ascending: false },
};

export async function fetchReviews(
  targetType: ReviewTargetType,
  targetId: string,
  sort: ReviewSort = "recent",
): Promise<ReviewRow[]> {
  const { column, ascending } = SORT_COLUMNS[sort];
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_PUBLIC_SELECT)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("status", "visible")
    .order(column, { ascending })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// The viewer's own review for this target, whatever its status (pending/
// hidden/removed included) — RLS already restricts this to rows the caller
// authored, so selecting reviewer_id here doesn't expose anyone else's.
export async function fetchOwnReview(
  targetType: ReviewTargetType,
  targetId: string,
  reviewerId: string,
): Promise<Review | null> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("reviewer_id", reviewerId)
    .neq("status", "removed")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchViewerVotedReviewIds(
  reviewIds: string[],
  userId: string,
): Promise<Set<string>> {
  if (reviewIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("review_votes")
    .select("review_id")
    .eq("user_id", userId)
    .in("review_id", reviewIds);
  if (error) throw error;
  return new Set((data ?? []).map((v) => v.review_id));
}

export async function createReview(input: {
  universityId: string;
  reviewerId: string;
  targetType: ReviewTargetType;
  targetId: string;
  rating: number;
  title: string | null;
  body: string;
  wouldRecommend: boolean | null;
  // Course-review-only — see validate_review_subratings in the migration.
  interestRating?: number | null;
  difficultyRating?: number | null;
  workloadRating?: number | null;
  teachingRating?: number | null;
  taughtByProfessorId?: string | null;
  alternateProfessorName?: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      university_id: input.universityId,
      reviewer_id: input.reviewerId,
      target_type: input.targetType,
      target_id: input.targetId,
      rating: input.rating,
      title: input.title,
      body: input.body,
      would_recommend: input.wouldRecommend,
      interest_rating: input.interestRating ?? null,
      difficulty_rating: input.difficultyRating ?? null,
      workload_rating: input.workloadRating ?? null,
      teaching_rating: input.teachingRating ?? null,
      taught_by_professor_id: input.taughtByProfessorId ?? null,
      alternate_professor_name: input.alternateProfessorName ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function removeOwnReview(id: string): Promise<void> {
  const { error } = await supabase.from("reviews").update({ status: "removed" }).eq("id", id);
  if (error) throw error;
}

export async function voteReviewHelpful(reviewId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("review_votes")
    .insert({ review_id: reviewId, user_id: userId });
  if (error) throw error;
}

export async function unvoteReviewHelpful(reviewId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("review_votes")
    .delete()
    .eq("review_id", reviewId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function reportReview(input: {
  reviewId: string;
  reporterId: string;
  reason: ReviewReportReason;
  details: string | null;
}): Promise<void> {
  const { error } = await supabase.from("review_reports").insert({
    review_id: input.reviewId,
    reporter_id: input.reporterId,
    reason: input.reason,
    details: input.details,
  });
  if (error) throw error;
}

export async function suggestProfessor(input: {
  universityId: string;
  submittedBy: string;
  firstName: string;
  lastName: string;
  department: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("entity_submissions")
    .insert({
      university_id: input.universityId,
      submitted_by: input.submittedBy,
      type: "professor",
      payload: {
        first_name: input.firstName,
        last_name: input.lastName,
        department: input.department,
      },
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function suggestCourse(input: {
  universityId: string;
  submittedBy: string;
  code: string;
  title: string;
  department: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("entity_submissions")
    .insert({
      university_id: input.universityId,
      submitted_by: input.submittedBy,
      type: "course",
      payload: { code: input.code, title: input.title, department: input.department },
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function fetchPendingEntitySubmissions() {
  const { data, error } = await supabase
    .from("entity_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function reviewEntitySubmission(
  submissionId: string,
  decision: "approve" | "reject" | "duplicate",
  mergeIntoId?: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("admin_review_entity_submission", {
    p_submission_id: submissionId,
    p_decision: decision,
    p_merge_into_id: mergeIntoId ?? null,
  });
  if (error) throw error;
  return data;
}
