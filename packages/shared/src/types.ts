import type { Database } from "./supabase/database.types";

export type University = Database["public"]["Tables"]["universities"]["Row"];
export type AppUser = Database["public"]["Tables"]["users"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostMedia = Database["public"]["Tables"]["post_media"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type Reaction = Database["public"]["Tables"]["reactions"]["Row"];
export type Community = Database["public"]["Tables"]["communities"]["Row"];
export type CommunityMember = Database["public"]["Tables"]["community_members"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Listing = Database["public"]["Tables"]["listings"]["Row"];
export type ListingMedia = Database["public"]["Tables"]["listing_media"]["Row"];

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

export type UserSearchResult = Pick<
  AppUser,
  "id" | "username" | "display_name" | "avatar_url" | "email" | "major"
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
