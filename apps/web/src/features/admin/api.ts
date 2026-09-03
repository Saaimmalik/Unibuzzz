import type {
  AlternateTeacherMention,
  AppUser,
  AuditLogEntry,
  CommunityStatus,
  CommunityWithMembership,
  EntitySubmission,
  EntitySubmissionType,
  Feedback,
  FeedbackStatus,
  ListingStatus,
  ListingWithSeller,
  Report,
  ReportStatus,
  ReportTargetType,
  Review,
  ReviewReport,
  ReviewStatus,
  UserRole,
  UserStatus,
} from "@unibuzzz/shared";
import { toIlikePattern } from "../../lib/search";
import { supabase } from "../../lib/supabase";

export type AdminUserRow = Pick<
  AppUser,
  "id" | "username" | "display_name" | "avatar_url" | "email" | "role" | "status" | "created_at"
>;

const ADMIN_USER_SELECT = "id,username,display_name,avatar_url,email,role,status,created_at";

// Same "separate ilike() queries merged client-side" convention as
// features/search/api.ts, for the same filter-injection-safety reason.
export async function fetchUsersForAdmin(params: {
  query: string;
  role?: UserRole;
  status?: UserStatus;
}): Promise<AdminUserRow[]> {
  const { query, role, status } = params;

  if (!query.trim()) {
    let base = supabase
      .from("users")
      .select(ADMIN_USER_SELECT)
      .order("created_at", { ascending: false })
      .limit(50);
    if (role) base = base.eq("role", role);
    if (status) base = base.eq("status", status);
    const { data, error } = await base;
    if (error) throw error;
    return (data ?? []) as AdminUserRow[];
  }

  const pattern = toIlikePattern(query);

  function searchColumn(column: "username" | "display_name" | "email") {
    let q = supabase.from("users").select(ADMIN_USER_SELECT).ilike(column, pattern).limit(20);
    if (role) q = q.eq("role", role);
    if (status) q = q.eq("status", status);
    return q;
  }

  const [byUsername, byDisplayName, byEmail] = await Promise.all([
    searchColumn("username"),
    searchColumn("display_name"),
    searchColumn("email"),
  ]);

  const byId = new Map<string, AdminUserRow>();
  for (const result of [byUsername, byDisplayName, byEmail]) {
    if (result.error) throw result.error;
    for (const user of (result.data ?? []) as AdminUserRow[]) byId.set(user.id, user);
  }
  return [...byId.values()].sort((a, b) => a.username.localeCompare(b.username));
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.from("users").update({ role }).eq("id", userId);
  if (error) throw error;
}

export async function updateUserStatus(userId: string, status: UserStatus): Promise<void> {
  const { error } = await supabase.from("users").update({ status }).eq("id", userId);
  if (error) throw error;
}

// --- Content: posts & comments -------------------------------------------

export type AdminPostRow = {
  id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
  author: Pick<AppUser, "id" | "username" | "display_name">;
};

export async function fetchPostsForAdmin(params: {
  query: string;
  includeRemoved: boolean;
}): Promise<AdminPostRow[]> {
  let q = supabase
    .from("posts")
    .select(
      "id,body,created_at,deleted_at,author:users!posts_author_id_fkey(id,username,display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (!params.includeRemoved) q = q.is("deleted_at", null);
  if (params.query.trim()) q = q.ilike("body", toIlikePattern(params.query));
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as AdminPostRow[];
}

export async function moderatePost(postId: string, deletedAt: string | null): Promise<void> {
  const { error } = await supabase.from("posts").update({ deleted_at: deletedAt }).eq("id", postId);
  if (error) throw error;
}

export type AdminCommentRow = {
  id: string;
  post_id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
  author: Pick<AppUser, "id" | "username" | "display_name">;
};

export async function fetchCommentsForAdmin(params: {
  query: string;
  includeRemoved: boolean;
}): Promise<AdminCommentRow[]> {
  let q = supabase
    .from("comments")
    .select(
      "id,post_id,body,created_at,deleted_at,author:users!comments_author_id_fkey(id,username,display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (!params.includeRemoved) q = q.is("deleted_at", null);
  if (params.query.trim()) q = q.ilike("body", toIlikePattern(params.query));
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as AdminCommentRow[];
}

export async function moderateComment(commentId: string, deletedAt: string | null): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .update({ deleted_at: deletedAt })
    .eq("id", commentId);
  if (error) throw error;
}

// --- Reviews ---------------------------------------------------------------

export async function fetchReviewsForAdmin(status?: ReviewStatus): Promise<Review[]> {
  let q = supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(50);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function moderateReview(reviewId: string, status: ReviewStatus): Promise<void> {
  const { error } = await supabase.from("reviews").update({ status }).eq("id", reviewId);
  if (error) throw error;
}

// Courses where one or more reviewers named a teacher not linked via
// professor_courses — see review_alternate_teacher_mentions() for why this
// is a plain RPC (grouping isn't expressible through PostgREST) and why it
// needs no staff-only guard of its own (relies on the reviews SELECT
// policy, same as course_teaching_ratings).
export async function fetchAlternateTeacherMentions(): Promise<AlternateTeacherMention[]> {
  const { data, error } = await supabase.rpc("review_alternate_teacher_mentions");
  if (error) throw error;
  return data ?? [];
}

export async function fetchReviewReports(): Promise<ReviewReport[]> {
  const { data, error } = await supabase
    .from("review_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

// --- General reports ---------------------------------------------------------

export async function fetchReports(params: {
  status?: ReportStatus;
  targetType?: ReportTargetType;
}): Promise<Report[]> {
  let q = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
  if (params.status) q = q.eq("status", params.status);
  if (params.targetType) q = q.eq("target_type", params.targetType);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function resolveReport(
  reportId: string,
  decision: "resolved" | "dismissed",
  note: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("resolve_report", {
    p_report_id: reportId,
    p_decision: decision,
    p_note: note,
  });
  if (error) throw error;
}

// --- Marketplace -------------------------------------------------------------

export async function fetchListingsForAdmin(params: {
  query: string;
  status?: ListingStatus;
}): Promise<ListingWithSeller[]> {
  let q = supabase
    .from("listings")
    .select(
      "*,seller:users!listings_seller_id_fkey(id,username,display_name,avatar_url),listing_media(*)",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (params.status) q = q.eq("status", params.status);
  if (params.query.trim()) q = q.ilike("title", toIlikePattern(params.query));
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ListingWithSeller[];
}

export async function moderateListing(listingId: string, status: ListingStatus): Promise<void> {
  const { error } = await supabase.from("listings").update({ status }).eq("id", listingId);
  if (error) throw error;
}

// --- Communities ---------------------------------------------------------------

export async function fetchCommunitiesForAdmin(params: {
  query: string;
  status?: CommunityStatus;
}): Promise<CommunityWithMembership[]> {
  let q = supabase
    .from("communities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (params.status) q = q.eq("status", params.status);
  if (params.query.trim()) q = q.ilike("name", toIlikePattern(params.query));
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((c) => ({ ...c, viewer_role: null }));
}

export async function moderateCommunity(
  communityId: string,
  status: CommunityStatus,
): Promise<void> {
  const { error } = await supabase.from("communities").update({ status }).eq("id", communityId);
  if (error) throw error;
}

// --- Entity submissions (professor/course/community requests) --------------

export async function fetchEntitySubmissions(
  types: EntitySubmissionType[],
): Promise<EntitySubmission[]> {
  const { data, error } = await supabase
    .from("entity_submissions")
    .select("*")
    .eq("status", "pending")
    .in("type", types)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Deliberately duplicated from features/reviews/api.ts's reviewEntitySubmission
// rather than imported — no feature in this codebase imports another
// feature's api.ts, and this keeps features/admin self-contained.
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

// --- Feedback (Request a Feature / Report a Bug) ----------------------------

export async function fetchFeedback(status?: FeedbackStatus): Promise<Feedback[]> {
  let q = supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus,
  adminNote: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("feedback")
    .update({ status, admin_note: adminNote })
    .eq("id", feedbackId);
  if (error) throw error;
}

// --- Audit log ---------------------------------------------------------------

export async function fetchAuditLog(params: {
  targetType?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  let q = supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 100);
  if (params.targetType) q = q.eq("target_type", params.targetType);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// --- Overview ------------------------------------------------------------------

export type AdminOverviewStats = {
  pendingReports: number;
  pendingCommunityRequests: number;
  pendingAcademicSubmissions: number;
  recentAuditLog: AuditLogEntry[];
};

async function countRows(
  builder: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const { count, error } = await builder;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchOverviewStats(): Promise<AdminOverviewStats> {
  const [pendingReports, pendingCommunityRequests, pendingAcademicSubmissions, recentAuditLog] =
    await Promise.all([
      countRows(
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ),
      countRows(
        supabase
          .from("entity_submissions")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
          .eq("type", "community"),
      ),
      countRows(
        supabase
          .from("entity_submissions")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
          .in("type", ["professor", "course"]),
      ),
      fetchAuditLog({ limit: 10 }),
    ]);

  return { pendingReports, pendingCommunityRequests, pendingAcademicSubmissions, recentAuditLog };
}
