import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a message first")
    .max(2000, "That's a bit long (2000 char max)"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
