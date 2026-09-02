import { z } from "zod";

// Kept lenient on the exact domain (server-side resolve_university_for_email
// / the signup trigger are the source of truth on which domains are
// supported) — this just checks it's a plausible email shape.
export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username must be at most 24 characters")
  .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

export const signUpSchema = z
  .object({
    email: emailSchema,
    username: usernameSchema,
    displayName: z.string().trim().min(1, "Enter your name").max(60, "Name is too long"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const logInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export type LogInInput = z.infer<typeof logInSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
