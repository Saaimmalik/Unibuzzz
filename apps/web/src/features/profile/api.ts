import { supabase } from "../../lib/supabase";

const AVATAR_BUCKET = "avatars";

export async function uploadAvatar(
  universityId: string,
  userId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${universityId}/${userId}/avatar.${ext}`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;

  // Public bucket, so the URL is stable and needs no signing — unlike
  // post-media, see the migration comment for why avatars trade privacy
  // for simplicity here.
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`; // cache-bust since the path is stable across re-uploads
}

export async function updateProfile(
  userId: string,
  updates: {
    display_name: string;
    bio: string | null;
    degree: string | null;
    grad_year: number | null;
    avatar_url?: string;
  },
): Promise<void> {
  const { error } = await supabase.from("users").update(updates).eq("id", userId);
  if (error) throw error;
}
