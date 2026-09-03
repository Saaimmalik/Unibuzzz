import type {
  CommunityStatus,
  EntitySubmissionType,
  FeedbackStatus,
  ListingStatus,
  ReportStatus,
  ReportTargetType,
  ReviewStatus,
  UserRole,
  UserStatus,
} from "@unibuzzz/shared";
import { isStaffRole } from "@unibuzzz/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import {
  fetchAlternateTeacherMentions,
  fetchAuditLog,
  fetchCommentsForAdmin,
  fetchCommunitiesForAdmin,
  fetchEntitySubmissions,
  fetchFeedback,
  fetchListingsForAdmin,
  fetchOverviewStats,
  fetchPostsForAdmin,
  fetchReports,
  fetchReviewReports,
  fetchReviewsForAdmin,
  fetchUsersForAdmin,
  moderateComment,
  moderateCommunity,
  moderateListing,
  moderatePost,
  moderateReview,
  resolveReport,
  reviewEntitySubmission,
  updateFeedbackStatus,
  updateUserRole,
  updateUserStatus,
} from "./api";

function useIsStaff(): boolean {
  const { appUser } = useAuth();
  return isStaffRole(appUser?.role);
}

// --- Users -------------------------------------------------------------------

export function useAdminUsers(params: { query: string; role?: UserRole; status?: UserStatus }) {
  const enabled = useIsStaff();
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => fetchUsersForAdmin(params),
    enabled,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole(userId, role),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: UserStatus }) =>
      updateUserStatus(userId, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// --- Content -------------------------------------------------------------------

export function useAdminPosts(params: { query: string; includeRemoved: boolean }) {
  const enabled = useIsStaff();
  return useQuery({
    queryKey: ["admin", "posts", params],
    queryFn: () => fetchPostsForAdmin(params),
    enabled,
  });
}

export function useModeratePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, deletedAt }: { postId: string; deletedAt: string | null }) =>
      moderatePost(postId, deletedAt),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "posts"] }),
  });
}

export function useAdminComments(params: { query: string; includeRemoved: boolean }) {
  const enabled = useIsStaff();
  return useQuery({
    queryKey: ["admin", "comments", params],
    queryFn: () => fetchCommentsForAdmin(params),
    enabled,
  });
}

export function useModerateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, deletedAt }: { commentId: string; deletedAt: string | null }) =>
      moderateComment(commentId, deletedAt),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "comments"] }),
  });
}

// --- Reviews -------------------------------------------------------------------

export function useAdminReviews(status?: ReviewStatus) {
  const enabled = useIsStaff();
  return useQuery({
    queryKey: ["admin", "reviews", status ?? "all"],
    queryFn: () => fetchReviewsForAdmin(status),
    enabled,
  });
}

export function useModerateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, status }: { reviewId: string; status: ReviewStatus }) =>
      moderateReview(reviewId, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });
}

export function useAdminReviewReports() {
  const enabled = useIsStaff();
  return useQuery({
    queryKey: ["admin", "review-reports"],
    queryFn: fetchReviewReports,
    enabled,
  });
}

// --- Reports ---------------------------------------------------------------------

export function useAdminReports(params: { status?: ReportStatus; targetType?: ReportTargetType }) {
  const enabled = useIsStaff();
  return useQuery({
    queryKey: ["admin", "reports", params],
    queryFn: () => fetchReports(params),
    enabled,
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reportId,
      decision,
      note,
    }: {
      reportId: string;
      decision: "resolved" | "dismissed";
      note: string | null;
    }) => resolveReport(reportId, decision, note),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
  });
}

// --- Marketplace -----------------------------------------------------------------

export function useAdminListings(params: { query: string; status?: ListingStatus }) {
  const enabled = useIsStaff();
  return useQuery({
    queryKey: ["admin", "listings", params],
    queryFn: () => fetchListingsForAdmin(params),
    enabled,
  });
}

export function useModerateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, status }: { listingId: string; status: ListingStatus }) =>
      moderateListing(listingId, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "listings"] }),
  });
}

// --- Communities -----------------------------------------------------------------

export function useAdminCommunities(params: { query: string; status?: CommunityStatus }) {
  const enabled = useIsStaff();
  return useQuery({
    queryKey: ["admin", "communities", params],
    queryFn: () => fetchCommunitiesForAdmin(params),
    enabled,
  });
}

export function useModerateCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, status }: { communityId: string; status: CommunityStatus }) =>
      moderateCommunity(communityId, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "communities"] }),
  });
}

// --- Entity submissions (professor/course/community requests) --------------------

export function useEntitySubmissions(types: EntitySubmissionType[]) {
  const enabled = useIsStaff();
  return useQuery({
    queryKey: ["admin", "entity-submissions", ...types],
    queryFn: () => fetchEntitySubmissions(types),
    enabled,
  });
}

export function useReviewEntitySubmissionAdmin() {
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
      void queryClient.invalidateQueries({ queryKey: ["admin", "entity-submissions"] }),
  });
}

// --- Alternate teacher mentions (from course reviews' "who taught you?") ---------

export function useAlternateTeacherMentions() {
  const enabled = useIsStaff();
  return useQuery({
    queryKey: ["admin", "alternate-teacher-mentions"],
    queryFn: fetchAlternateTeacherMentions,
    enabled,
  });
}

// --- Feedback (Request a Feature / Report a Bug) --------------------------------

export function useAdminFeedback(status?: FeedbackStatus) {
  const enabled = useIsStaff();
  return useQuery({
    queryKey: ["admin", "feedback", status ?? "all"],
    queryFn: () => fetchFeedback(status),
    enabled,
  });
}

export function useUpdateFeedbackStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      feedbackId,
      status,
      adminNote,
    }: {
      feedbackId: string;
      status: FeedbackStatus;
      adminNote: string | null;
    }) => updateFeedbackStatus(feedbackId, status, adminNote),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "feedback"] }),
  });
}

// --- Audit log ---------------------------------------------------------------------

export function useAuditLog(targetType?: string) {
  const enabled = useIsStaff();
  return useQuery({
    queryKey: ["admin", "audit-log", targetType ?? "all"],
    queryFn: () => fetchAuditLog({ targetType }),
    enabled,
  });
}

// --- Overview ------------------------------------------------------------------------

export function useAdminOverview() {
  const enabled = useIsStaff();
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: fetchOverviewStats,
    enabled,
  });
}
