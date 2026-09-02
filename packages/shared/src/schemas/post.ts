import { z } from "zod";

export const createPostSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Say something first")
    .max(2000, "That's a bit long (2000 char max)"),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a comment first")
    .max(1000, "That's a bit long (1000 char max)"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
