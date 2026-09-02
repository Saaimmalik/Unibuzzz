import { supabase } from "../../lib/supabase";

const BUCKET = "post-media";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function uploadPostImage(
  universityId: string,
  authorId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${universityId}/${authorId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;

  // post_media.url stores this storage path, not a public URL — the
  // bucket is private (post content is university-only), so rendering it
  // requires resolving a short-lived signed URL via getSignedUrls below.
  return path;
}

export async function getSignedUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return new Map();

  const map = new Map<string, string>();
  for (const entry of data) {
    if (entry.signedUrl && entry.path) map.set(entry.path, entry.signedUrl);
  }
  return map;
}
