import { z } from "zod";

export const REVIEW_REPORT_REASONS = [
  "harassment",
  "personal_info",
  "spam",
  "off_topic",
  "fake",
  "other",
] as const;

// No .default() here — breaks react-hook-form's resolver typing (see
// AGENTS.md). Defaults for rating/wouldRecommend are seeded via useForm's
// defaultValues instead.
//
// interest/difficulty/workload/teaching are course-review-only (see the DB
// check in validate_review_subratings) — represented as 0-5 where 0 means
// "not rated" (StarRating starts at 0 for these, unlike the required
// overall `rating` which starts at 5); the API layer converts 0 -> null
// before sending, since the DB constraint is 1-5 or null, never 0.
export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5, "Pick a rating"),
  title: z.string().trim().max(120, "That's a bit long").optional().or(z.literal("")),
  body: z
    .string()
    .trim()
    .min(15, "Say a bit more (15 characters minimum)")
    .max(3000, "That's a bit long (3000 char max)"),
  wouldRecommend: z.enum(["yes", "no", "unsure"]).optional(),
  interestRating: z.coerce.number().int().min(0).max(5).optional(),
  difficultyRating: z.coerce.number().int().min(0).max(5).optional(),
  workloadRating: z.coerce.number().int().min(0).max(5).optional(),
  teachingRating: z.coerce.number().int().min(0).max(5).optional(),
  taughtByProfessorId: z.string().optional().or(z.literal("")),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const reportReviewSchema = z.object({
  reason: z.enum(REVIEW_REPORT_REASONS),
  details: z.string().trim().max(500, "That's a bit long").optional().or(z.literal("")),
});

export type ReportReviewInput = z.infer<typeof reportReviewSchema>;

export const suggestProfessorSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name").max(80, "That's a bit long"),
  lastName: z.string().trim().min(1, "Enter a last name").max(80, "That's a bit long"),
  department: z.string().trim().min(1, "Enter a department").max(120, "That's a bit long"),
});

export type SuggestProfessorInput = z.infer<typeof suggestProfessorSchema>;

export const suggestCourseSchema = z.object({
  code: z.string().trim().min(1, "Enter a module code").max(20, "That's a bit long"),
  title: z.string().trim().min(1, "Enter a title").max(160, "That's a bit long"),
  department: z.string().trim().min(1, "Enter a department").max(120, "That's a bit long"),
});

export type SuggestCourseInput = z.infer<typeof suggestCourseSchema>;
