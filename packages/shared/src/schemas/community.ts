import { z } from "zod";

export const createCommunitySchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(80, "That's a bit long (80 char max)"),
  description: z
    .string()
    .trim()
    .max(500, "That's a bit long (500 char max)")
    .optional()
    .or(z.literal("")),
  // No .default() here — the component seeds this via useForm's
  // defaultValues instead, since z.default() makes the field optional on
  // the resolver's *input* type while react-hook-form expects input and
  // output types to match, which zodResolver can't reconcile.
  type: z.enum(["public", "restricted"]),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
