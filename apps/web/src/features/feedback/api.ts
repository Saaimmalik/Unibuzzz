import type { FeedbackType } from "@unibuzzz/shared";
import { supabase } from "../../lib/supabase";

export async function submitFeedback(input: {
  universityId: string;
  userId: string;
  type: FeedbackType;
  subject: string;
  body: string;
}): Promise<void> {
  const { error } = await supabase.from("feedback").insert({
    university_id: input.universityId,
    user_id: input.userId,
    type: input.type,
    subject: input.subject,
    body: input.body,
  });
  if (error) throw error;
}
