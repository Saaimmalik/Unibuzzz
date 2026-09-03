// Hand-authored to match supabase/migrations/*.sql until a real Supabase
// project exists to generate from. Once linked, regenerate with:
//   supabase gen types typescript --linked > packages/shared/src/supabase/database.types.ts
// and delete this comment.

export type UniversityStatus = "active" | "coming_soon";
export type UserRole = "student" | "moderator" | "admin";
export type UserStatus = "active" | "suspended" | "banned" | "deactivated" | "deleted";
export type WhoCanMessage = "everyone" | "following" | "nobody";
export type FeedbackType = "feature_request" | "bug_report";
export type FeedbackStatus = "open" | "in_progress" | "resolved" | "closed";
export type ThemePreference = "light" | "dark" | "system";
export type ReactionTargetType = "post" | "comment";
export type ReactionType = "like" | "upvote" | "downvote";
export type CommunityType = "public" | "restricted";
export type CommunityStatus = "active" | "locked" | "removed";
export type CommunityMemberRole = "member" | "mod" | "owner";
export type ListingCategory =
  "textbooks" | "electronics" | "furniture" | "clothing" | "tickets" | "housing" | "other";
export type ListingCondition = "new" | "like_new" | "good" | "fair" | "poor";
export type ListingStatus = "active" | "sold" | "removed";
export type ReviewTargetType = "professor" | "course";
export type ReviewStatus = "pending" | "visible" | "hidden" | "removed";
export type ReviewReportReason =
  "harassment" | "personal_info" | "spam" | "off_topic" | "fake" | "other";
export type EntitySubmissionType = "professor" | "course" | "community";
export type EntitySubmissionStatus = "pending" | "approved" | "rejected" | "duplicate";
export type ReportTargetType = "post" | "comment" | "listing" | "message" | "community" | "user";
export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "inappropriate_content"
  | "scam"
  | "impersonation"
  | "other";
export type ReportStatus = "pending" | "resolved" | "dismissed";
export type NotificationType =
  | "post_like"
  | "post_comment"
  | "message"
  | "review_helpful"
  | "content_removed"
  | "report_resolved"
  | "community_approved"
  | "community_rejected";
export type EmailLogCategory = "auth" | "app";
export type EmailLogStatus = "sent" | "failed";

export interface Database {
  public: {
    Tables: {
      universities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          email_domains: string[];
          primary_color: string | null;
          logo_url: string | null;
          status: UniversityStatus;
          features: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          email_domains: string[];
          primary_color?: string | null;
          logo_url?: string | null;
          status?: UniversityStatus;
          features?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["universities"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          university_id: string;
          auth_user_id: string;
          email: string;
          email_verified_at: string | null;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          degree: string | null;
          grad_year: number | null;
          role: UserRole;
          status: UserStatus;
          theme_preference: ThemePreference;
          follower_count: number;
          following_count: number;
          who_can_message: WhoCanMessage;
          hide_follow_counts: boolean;
          email_pref_comments: boolean;
          email_pref_likes: boolean;
          email_pref_messages: boolean;
          email_pref_community: boolean;
          email_pref_marketplace: boolean;
          email_pref_reviews: boolean;
          email_pref_announcements: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          auth_user_id: string;
          email: string;
          email_verified_at?: string | null;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          degree?: string | null;
          grad_year?: number | null;
          role?: UserRole;
          status?: UserStatus;
          theme_preference?: ThemePreference;
          follower_count?: number;
          following_count?: number;
          who_can_message?: WhoCanMessage;
          hide_follow_counts?: boolean;
          email_pref_comments?: boolean;
          email_pref_likes?: boolean;
          email_pref_messages?: boolean;
          email_pref_community?: boolean;
          email_pref_marketplace?: boolean;
          email_pref_reviews?: boolean;
          email_pref_announcements?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "users_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          id: string;
          university_id: string;
          author_id: string;
          community_id: string | null;
          body: string;
          like_count: number;
          comment_count: number;
          is_anonymous: boolean;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          university_id: string;
          author_id: string;
          community_id?: string | null;
          body: string;
          like_count?: number;
          comment_count?: number;
          is_anonymous?: boolean;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
        ];
      };
      post_media: {
        Row: {
          id: string;
          post_id: string;
          url: string;
          type: "image";
          position: number;
        };
        Insert: {
          id?: string;
          post_id: string;
          url: string;
          type?: "image";
          position?: number;
        };
        Update: Partial<Database["public"]["Tables"]["post_media"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          parent_comment_id: string | null;
          author_id: string;
          body: string;
          is_anonymous: boolean;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          parent_comment_id?: string | null;
          author_id: string;
          body: string;
          is_anonymous?: boolean;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reactions: {
        Row: {
          id: string;
          target_type: ReactionTargetType;
          target_id: string;
          user_id: string;
          type: ReactionType;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_type: ReactionTargetType;
          target_id: string;
          user_id: string;
          type: ReactionType;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reactions"]["Insert"]>;
        Relationships: [];
      };
      communities: {
        Row: {
          id: string;
          university_id: string;
          slug: string;
          name: string;
          description: string | null;
          type: CommunityType;
          status: CommunityStatus;
          member_count: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          slug: string;
          name: string;
          description?: string | null;
          type?: CommunityType;
          status?: CommunityStatus;
          member_count?: number;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["communities"]["Insert"]>;
        Relationships: [];
      };
      community_members: {
        Row: {
          community_id: string;
          user_id: string;
          role: CommunityMemberRole;
          joined_at: string;
        };
        Insert: {
          community_id: string;
          user_id: string;
          role?: CommunityMemberRole;
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["community_members"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          university_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          university_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["follows"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          university_id: string;
          type: "dm" | "marketplace";
          listing_id: string | null;
          last_message_at: string | null;
          last_message_body: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          type?: "dm" | "marketplace";
          listing_id?: string | null;
          last_message_at?: string | null;
          last_message_body?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversation_participants"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          id: string;
          university_id: string;
          seller_id: string;
          title: string;
          description: string;
          price_cents: number;
          category: ListingCategory;
          condition: ListingCondition;
          status: ListingStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          seller_id: string;
          title: string;
          description: string;
          price_cents: number;
          category: ListingCategory;
          condition: ListingCondition;
          status?: ListingStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["listings"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_media: {
        Row: {
          id: string;
          listing_id: string;
          url: string;
          position: number;
        };
        Insert: {
          id?: string;
          listing_id: string;
          url: string;
          position?: number;
        };
        Update: Partial<Database["public"]["Tables"]["listing_media"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "listing_media_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      professors: {
        Row: {
          id: string;
          university_id: string;
          first_name: string;
          last_name: string;
          department: string;
          slug: string;
          review_count: number;
          avg_rating: number;
          trending_score: number;
          merged_into_id: string | null;
          would_recommend_pct: number | null;
          title: string | null;
          source_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          first_name: string;
          last_name: string;
          department: string;
          slug: string;
          review_count?: number;
          avg_rating?: number;
          trending_score?: number;
          merged_into_id?: string | null;
          would_recommend_pct?: number | null;
          title?: string | null;
          source_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["professors"]["Insert"]>;
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          university_id: string;
          code: string;
          title: string;
          department: string;
          slug: string;
          review_count: number;
          avg_rating: number;
          avg_interest: number;
          avg_difficulty: number;
          avg_workload: number;
          would_recommend_pct: number | null;
          trending_score: number;
          merged_into_id: string | null;
          credits: number | null;
          student_effort_hours: number | null;
          delivery: string | null;
          level: string | null;
          grading: string | null;
          learning_outcomes: string | null;
          teaching_methods: string | null;
          assessment_breakdown: unknown;
          description: string | null;
          source_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          code: string;
          title: string;
          department: string;
          slug: string;
          review_count?: number;
          avg_rating?: number;
          avg_interest?: number;
          avg_difficulty?: number;
          avg_workload?: number;
          would_recommend_pct?: number | null;
          trending_score?: number;
          merged_into_id?: string | null;
          credits?: number | null;
          student_effort_hours?: number | null;
          delivery?: string | null;
          level?: string | null;
          grading?: string | null;
          learning_outcomes?: string | null;
          teaching_methods?: string | null;
          assessment_breakdown?: unknown;
          description?: string | null;
          source_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
        Relationships: [];
      };
      professor_courses: {
        Row: {
          professor_id: string;
          course_id: string;
          is_coordinator: boolean;
        };
        Insert: {
          professor_id: string;
          course_id: string;
          is_coordinator?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["professor_courses"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "professor_courses_professor_id_fkey";
            columns: ["professor_id"];
            isOneToOne: false;
            referencedRelation: "professors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professor_courses_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          university_id: string;
          reviewer_id: string;
          target_type: ReviewTargetType;
          target_id: string;
          rating: number;
          title: string | null;
          body: string;
          tags: string[];
          would_recommend: boolean | null;
          helpful_count: number;
          status: ReviewStatus;
          flagged_pii: boolean;
          interest_rating: number | null;
          difficulty_rating: number | null;
          workload_rating: number | null;
          teaching_rating: number | null;
          taught_by_professor_id: string | null;
          alternate_professor_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          reviewer_id: string;
          target_type: ReviewTargetType;
          target_id: string;
          rating: number;
          title?: string | null;
          body: string;
          tags?: string[];
          would_recommend?: boolean | null;
          helpful_count?: number;
          status?: ReviewStatus;
          flagged_pii?: boolean;
          interest_rating?: number | null;
          difficulty_rating?: number | null;
          workload_rating?: number | null;
          teaching_rating?: number | null;
          taught_by_professor_id?: string | null;
          alternate_professor_name?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
        Relationships: [];
      };
      review_votes: {
        Row: {
          review_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          review_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["review_votes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      review_reports: {
        Row: {
          id: string;
          review_id: string;
          reporter_id: string;
          reason: ReviewReportReason;
          details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          reporter_id: string;
          reason: ReviewReportReason;
          details?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["review_reports"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "review_reports_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      entity_submissions: {
        Row: {
          id: string;
          university_id: string;
          submitted_by: string;
          type: EntitySubmissionType;
          payload: Record<string, unknown>;
          status: EntitySubmissionStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          submitted_by: string;
          type: EntitySubmissionType;
          payload: Record<string, unknown>;
          status?: EntitySubmissionStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["entity_submissions"]["Insert"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          university_id: string;
          reporter_id: string;
          target_type: ReportTargetType;
          target_id: string;
          reason: ReportReason;
          details: string | null;
          status: ReportStatus;
          resolved_by: string | null;
          resolved_at: string | null;
          resolution_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          reporter_id: string;
          target_type: ReportTargetType;
          target_id: string;
          reason: ReportReason;
          details?: string | null;
          status?: ReportStatus;
          resolved_by?: string | null;
          resolved_at?: string | null;
          resolution_note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          university_id: string;
          actor_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          reason: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          actor_id?: string | null;
          action: string;
          target_type: string;
          target_id?: string | null;
          reason?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          university_id: string;
          recipient_id: string;
          actor_id: string | null;
          type: NotificationType;
          link_path: string;
          preview: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          recipient_id: string;
          actor_id?: string | null;
          type: NotificationType;
          link_path: string;
          preview?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      blocked_users: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          university_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          university_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["blocked_users"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback: {
        Row: {
          id: string;
          university_id: string;
          user_id: string;
          type: FeedbackType;
          subject: string;
          body: string;
          status: FeedbackStatus;
          admin_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          user_id: string;
          type: FeedbackType;
          subject: string;
          body: string;
          status?: FeedbackStatus;
          admin_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feedback"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      email_log: {
        Row: {
          id: string;
          created_at: string;
          category: EmailLogCategory;
          event_type: string;
          recipient_email: string;
          status: EmailLogStatus;
          error_message: string | null;
          provider_message_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          category: EmailLogCategory;
          event_type: string;
          recipient_email: string;
          status: EmailLogStatus;
          error_message?: string | null;
          provider_message_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["email_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      resolve_university_for_email: {
        Args: { p_email: string };
        Returns: Database["public"]["Tables"]["universities"]["Row"] | null;
      };
      start_dm_conversation: {
        Args: { p_other_user_id: string };
        Returns: string;
      };
      start_marketplace_conversation: {
        Args: { p_listing_id: string };
        Returns: string;
      };
      is_username_available: {
        Args: { p_username: string };
        Returns: boolean;
      };
      deactivate_own_account: {
        Args: Record<string, never>;
        Returns: void;
      };
      reactivate_own_account: {
        Args: Record<string, never>;
        Returns: void;
      };
      delete_own_account: {
        Args: Record<string, never>;
        Returns: void;
      };
      admin_review_entity_submission: {
        Args: { p_submission_id: string; p_decision: string; p_merge_into_id?: string | null };
        Returns: string | null;
      };
      resolve_report: {
        Args: { p_report_id: string; p_decision: string; p_note?: string | null };
        Returns: void;
      };
      course_teaching_ratings: {
        Args: { p_course_id: string };
        Returns: { professor_id: string; avg_teaching: number; rating_count: number }[];
      };
      review_alternate_teacher_mentions: {
        Args: Record<string, never>;
        Returns: {
          course_id: string;
          course_code: string;
          course_title: string;
          course_slug: string;
          mentioned_name: string;
          mention_count: number;
          latest_mentioned_at: string;
        }[];
      };
    };
  };
}
