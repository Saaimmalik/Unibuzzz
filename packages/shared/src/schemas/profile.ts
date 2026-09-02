import { z } from "zod";

const currentYear = new Date().getFullYear();

export const editProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(60, "Name is too long"),
  bio: z
    .string()
    .trim()
    .max(280, "Bio must be at most 280 characters")
    .optional()
    .or(z.literal("")),
  major: z.string().trim().max(80, "That's a bit long").optional().or(z.literal("")),
  gradYear: z.coerce
    .number()
    .int()
    .min(currentYear - 1, "Grad year seems off")
    .max(currentYear + 8, "Grad year seems off")
    .optional()
    .or(z.literal("")),
});

export type EditProfileInput = z.infer<typeof editProfileSchema>;
