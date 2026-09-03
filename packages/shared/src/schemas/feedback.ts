import { z } from "zod";

export const FEEDBACK_TYPES = ["feature_request", "bug_report"] as const;

export const createFeedbackSchema = z.object({
  type: z.enum(FEEDBACK_TYPES),
  subject: z.string().trim().min(3, "Give it a short title").max(150, "That's a bit long"),
  body: z
    .string()
    .trim()
    .min(10, "Tell us a bit more")
    .max(3000, "That's a bit long — try to keep it under 3000 characters"),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
