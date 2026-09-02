import type { ReviewPublic, ReviewReportReason, ReviewTargetType } from "@unibuzzz/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import {
  createReview,
  fetchCourseBySlug,
  fetchCourseTeachingRatings,
  fetchMostReviewedCourses,
  fetchMostReviewedProfessors,
  fetchOwnReview,
  fetchPendingEntitySubmissions,
  fetchProfessorBySlug,
  fetchReviews,
  fetchTrendingCourses,
  fetchTrendingProfessors,
  fetchViewerVotedReviewIds,
  removeOwnReview,
  reportReview,
  reviewEntitySubmission,
  searchCourses,
  searchProfessors,
  suggestCourse,
  suggestProfessor,
  unvoteReviewHelpful,
  voteReviewHelpful,
  type ReviewSort,
} from "./api";

export function useTrendingProfessors(limit?: number) {
  return useQuery({
    queryKey: ["professors", "trending", limit],
    queryFn: () => fetchTrendingProfessors(limit),
  });
}

export function useMostReviewedProfessors(limit?: number) {
  return useQuery({
    queryKey: ["professors", "most-reviewed", limit],
    queryFn: () => fetchMostReviewedProfessors(limit),
  });
}

export function useTrendingCourses(limit?: number) {
  return useQuery({
    queryKey: ["courses", "trending", limit],
    queryFn: () => fetchTrendingCourses(limit),
  });
}

export function useMostReviewedCourses(limit?: number) {
  return useQuery({
    queryKey: ["courses", "most-reviewed", limit],
    queryFn: () => fetchMostReviewedCourses(limit),
  });
}

export function useProfessorSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["search", "professors", trimmed],
    queryFn: () => searchProfessors(trimmed),
    enabled: trimmed.length >= 2,
  });
}

export function useCourseSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["search", "courses", trimmed],
    queryFn: () => searchCourses(trimmed),
    enabled: trimmed.length >= 2,
  });
}

export function useProfessor(slug: string) {
  return useQuery({
    queryKey: ["professors", "bySlug", slug],
    queryFn: () => fetchProfessorBySlug(slug),
    enabled: !!slug,
  });
}

export function useCourse(slug: string) {
  return useQuery({
    queryKey: ["courses", "bySlug", slug],
    queryFn: () => fetchCourseBySlug(slug),
    enabled: !!slug,
  });
}

// Per-module teaching ratings for a course's "Who Teaches It" section —
// keyed by professor id, distinct from that professor's overall page rating.
export function useCourseTeachingRatings(courseId: string) {
  return useQuery({
    queryKey: ["courses", courseId, "teaching-ratings"],
    queryFn: () => fetchCourseTeachingRatings(courseId),
    enabled: !!courseId,
  });
}

// Composes the public review list with the viewer's own review (surfaced
// even when pending/hidden, so they can see its status) and their helpful
// votes, all under one query-key prefix so a realtime insert invalidates
// everything together.
export function useReviews(targetType: ReviewTargetType, targetId: string, sort: ReviewSort = "recent") {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();
  const baseKey = ["reviews", targetType, targetId] as const;

  const reviewsQuery = useQuery({
    queryKey: [...baseKey, "list", sort],
    queryFn: () => fetchReviews(targetType, targetId, sort),
    enabled: !!targetId,
  });

  const ownReviewQuery = useQuery({
    queryKey: [...baseKey, "own", appUser?.id],
    queryFn: () => fetchOwnReview(targetType, targetId, appUser!.id),
    enabled: !!targetId && !!appUser,
  });

  const ownNotVisible =
    ownReviewQuery.data && ownReviewQuery.data.status !== "visible" ? ownReviewQuery.data : null;

  const allIds = [
    ...(reviewsQuery.data ?? []).map((r) => r.id),
    ...(ownNotVisible ? [ownNotVisible.id] : []),
  ];

  const votesQuery = useQuery({
    queryKey: [...baseKey, "votes", appUser?.id, allIds],
    queryFn: () => fetchViewerVotedReviewIds(allIds, appUser!.id),
    enabled: !!appUser && allIds.length > 0,
  });

  useEffect(() => {
    if (!targetId) return;
    const channel = supabase
      .channel(`reviews-${targetType}-${targetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews", filter: `target_id=eq.${targetId}` },
        () => void queryClient.invalidateQueries({ queryKey: baseKey }),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId, queryClient]);

  const reviews: ReviewPublic[] = [
    ...(ownNotVisible
      ? [
          {
            id: ownNotVisible.id,
            university_id: ownNotVisible.university_id,
            target_type: ownNotVisible.target_type,
            target_id: ownNotVisible.target_id,
            rating: ownNotVisible.rating,
            title: ownNotVisible.title,
            body: ownNotVisible.body,
            tags: ownNotVisible.tags,
            would_recommend: ownNotVisible.would_recommend,
            helpful_count: ownNotVisible.helpful_count,
            status: ownNotVisible.status,
            flagged_pii: ownNotVisible.flagged_pii,
            interest_rating: ownNotVisible.interest_rating,
            difficulty_rating: ownNotVisible.difficulty_rating,
            workload_rating: ownNotVisible.workload_rating,
            teaching_rating: ownNotVisible.teaching_rating,
            taught_by_professor_id: ownNotVisible.taught_by_professor_id,
            created_at: ownNotVisible.created_at,
            viewer_has_voted: false,
            is_own: true,
          },
        ]
      : []),
    ...(reviewsQuery.data ?? []).map((r) => ({
      ...r,
      viewer_has_voted: votesQuery.data?.has(r.id) ?? false,
      is_own: ownReviewQuery.data?.id === r.id,
    })),
  ];

  return {
    reviews,
    ownReview: ownReviewQuery.data ?? null,
    isLoading: reviewsQuery.isLoading,
    invalidate: () => void queryClient.invalidateQueries({ queryKey: baseKey }),
  };
}

export function useCreateReview(targetType: ReviewTargetType, targetId: string) {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      rating: number;
      title: string | null;
      body: string;
      wouldRecommend: boolean | null;
      interestRating?: number | null;
      difficultyRating?: number | null;
      workloadRating?: number | null;
      teachingRating?: number | null;
      taughtByProfessorId?: string | null;
    }) =>
      createReview({
        universityId: appUser!.university_id,
        reviewerId: appUser!.id,
        targetType,
        targetId,
        ...input,
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["reviews", targetType, targetId] }),
  });
}

export function useRemoveOwnReview(targetType: ReviewTargetType, targetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeOwnReview(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["reviews", targetType, targetId] }),
  });
}

export function useToggleReviewHelpful(targetType: ReviewTargetType, targetId: string) {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, currentlyVoted }: { reviewId: string; currentlyVoted: boolean }) =>
      currentlyVoted
        ? unvoteReviewHelpful(reviewId, appUser!.id)
        : voteReviewHelpful(reviewId, appUser!.id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["reviews", targetType, targetId] }),
  });
}

export function useReportReview() {
  const { appUser } = useAuth();
  return useMutation({
    mutationFn: (input: { reviewId: string; reason: ReviewReportReason; details: string | null }) =>
      reportReview({ ...input, reporterId: appUser!.id }),
  });
}

export function useSuggestProfessor() {
  const { appUser } = useAuth();
  return useMutation({
    mutationFn: (input: { firstName: string; lastName: string; department: string }) =>
      suggestProfessor({
        universityId: appUser!.university_id,
        submittedBy: appUser!.id,
        ...input,
      }),
  });
}

export function useSuggestCourse() {
  const { appUser } = useAuth();
  return useMutation({
    mutationFn: (input: { code: string; title: string; department: string }) =>
      suggestCourse({ universityId: appUser!.university_id, submittedBy: appUser!.id, ...input }),
  });
}

export function usePendingEntitySubmissions() {
  const { appUser } = useAuth();
  return useQuery({
    queryKey: ["entity_submissions", "pending"],
    queryFn: fetchPendingEntitySubmissions,
    enabled: appUser?.role === "moderator" || appUser?.role === "admin",
  });
}

export function useReviewEntitySubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      submissionId,
      decision,
      mergeIntoId,
    }: {
      submissionId: string;
      decision: "approve" | "reject" | "duplicate";
      mergeIntoId?: string;
    }) => reviewEntitySubmission(submissionId, decision, mergeIntoId),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["entity_submissions", "pending"] }),
  });
}
