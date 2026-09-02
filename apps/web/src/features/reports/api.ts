import type { ReportReason, ReportTargetType } from "@unibuzzz/shared";
import { supabase } from "../../lib/supabase";

export async function createReport(input: {
  universityId: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
}): Promise<void> {
  const { error } = await supabase.from("reports").insert({
    university_id: input.universityId,
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details,
  });
  if (error) throw error;
}
