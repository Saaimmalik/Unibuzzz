// Hand-authored to match supabase/migrations/*.sql until a real Supabase
// project exists to generate from. Once linked, regenerate with:
//   supabase gen types typescript --linked > packages/shared/src/supabase/database.types.ts
// and delete this comment.

export type UniversityStatus = "active" | "coming_soon";
export type UserRole = "student" | "moderator" | "admin";
export type UserStatus = "active" | "suspended" | "banned";

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
          major: string | null;
          grad_year: number | null;
          role: UserRole;
          status: UserStatus;
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
          major?: string | null;
          grad_year?: number | null;
          role?: UserRole;
          status?: UserStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
    };
  };
}
