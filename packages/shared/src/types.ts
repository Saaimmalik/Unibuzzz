import type { Database } from "./supabase/database.types";

export type University = Database["public"]["Tables"]["universities"]["Row"];
export type AppUser = Database["public"]["Tables"]["users"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostMedia = Database["public"]["Tables"]["post_media"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type Reaction = Database["public"]["Tables"]["reactions"]["Row"];
export type Community = Database["public"]["Tables"]["communities"]["Row"];
export type CommunityMember = Database["public"]["Tables"]["community_members"]["Row"];
export type Follow = Database["public"]["Tables"]["follows"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Listing = Database["public"]["Tables"]["listings"]["Row"];
export type ListingMedia = Database["public"]["Tables"]["listing_media"]["Row"];
export type Professor = Database["public"]["Tables"]["professors"]["Row"];
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type ReviewVote = Database["public"]["Tables"]["review_votes"]["Row"];
export type ReviewReport = Database["public"]["Tables"]["review_reports"]["Row"];
export type EntitySubmission = Database["public"]["Tables"]["entity_submissions"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type AuditLogEntry = Database["public"]["Tables"]["audit_log"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type BlockedUser = Database["public"]["Tables"]["blocked_users"]["Row"];
export type Feedback = Database["public"]["Tables"]["feedback"]["Row"];

export type PostWithAuthor = Post & {
  author: Pick<AppUser, "id" | "username" | "display_name" | "avatar_url">;
  post_media: PostMedia[];
  // The viewer's own reaction on this post, if any — 'like' in the main
  // feed, 'upvote'/'downvote' in a community. Not just a boolean, since a
  // community post needs to know *which direction* the viewer voted.
  viewer_reaction: Reaction["type"] | null;
};

export type CommentWithAuthor = Comment & {
  author: Pick<AppUser, "id" | "username" | "display_name" | "avatar_url">;
};

export type NotificationWithActor = Notification & {
  // Null when actor_id is null (a system-originated notification — content
  // moderation, report resolution) or when the actor account no longer
  // exists (actor_id on delete set null).
  actor: Pick<AppUser, "id" | "username" | "display_name" | "avatar_url"> | null;
};

export type BlockedUserWithProfile = BlockedUser & {
  blocked: Pick<AppUser, "id" | "username" | "display_name" | "avatar_url">;
};

export type UserSearchResult = Pick<
  AppUser,
  | "id"
  | "username"
  | "display_name"
  | "avatar_url"
  | "email"
  | "degree"
  | "follower_count"
  | "following_count"
  | "hide_follow_counts"
>;

export type CommunityWithMembership = Community & {
  viewer_role: CommunityMember["role"] | null;
};

export type ConversationWithParticipant = Conversation & {
  other_participant: Pick<AppUser, "id" | "username" | "display_name" | "avatar_url">;
  unread_count: number;
  listing_title: string | null;
};

export type ListingWithSeller = Listing & {
  seller: Pick<AppUser, "id" | "username" | "display_name" | "avatar_url">;
  listing_media: ListingMedia[];
};

// Reviewer identity is deliberately never fetched by the app for reviews
// (see supabase/migrations/20260902270000_reviews_core.sql) — reviews are
// anonymous-to-other-students by design, so ReviewPublic has no author
// field at all, unlike PostWithAuthor/CommentWithAuthor.
export type ReviewPublic = Omit<Review, "reviewer_id"> & {
  // Whether the current viewer has marked this review helpful, and whether
  // they authored it (both computed client-side from the viewer's own id,
  // not from a reviewer_id the API returns).
  viewer_has_voted: boolean;
  is_own: boolean;
};

export type ProfessorWithCourses = Professor & {
  professor_courses: {
    course: Pick<Course, "id" | "code" | "title" | "slug">;
    is_coordinator: boolean;
  }[];
};

export type AssessmentComponent = {
  type: string;
  weight_pct: number;
  detail?: string;
};

export type CourseWithProfessors = Omit<Course, "assessment_breakdown"> & {
  assessment_breakdown: AssessmentComponent[];
  professor_courses: {
    professor: Pick<Professor, "id" | "first_name" | "last_name" | "slug" | "title">;
    is_coordinator: boolean;
  }[];
};

// From the course_teaching_ratings() SQL function — a module coordinator's
// teaching rating scoped to *this* course only, distinct from their overall
// professor-page avg_rating.
export type CourseTeachingRating = {
  professor_id: string;
  avg_teaching: number;
  rating_count: number;
};

// From the review_alternate_teacher_mentions() SQL function — courses where
// one or more reviewers named a teacher other than a linked professor, for
// staff to review against professor_courses (see AdminAcademicsPage).
export type AlternateTeacherMention = {
  course_id: string;
  course_code: string;
  course_title: string;
  course_slug: string;
  mentioned_name: string;
  mention_count: number;
  latest_mentioned_at: string;
};
