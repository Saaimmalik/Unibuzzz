import { z } from "zod";

export const REPORT_TARGET_TYPES = [
  "post",
  "comment",
  "listing",
  "message",
  "community",
  "user",
] as const;

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "hate_speech",
  "inappropriate_content",
  "scam",
  "impersonation",
  "other",
] as const;

// targetType/targetId are passed as props to the dialog, not form fields —
// same split as reportReviewSchema/ReportReviewModal.tsx's reviewId prop.
export const createReportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500, "That's a bit long").optional().or(z.literal("")),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
