import { z } from "zod";

export const LISTING_CATEGORIES = [
  "textbooks",
  "electronics",
  "furniture",
  "clothing",
  "tickets",
  "housing",
  "other",
] as const;

export const LISTING_CONDITIONS = ["new", "like_new", "good", "fair", "poor"] as const;

export const createListingSchema = z.object({
  title: z.string().trim().min(1, "Give it a title").max(100, "That's a bit long (100 char max)"),
  description: z
    .string()
    .trim()
    .min(1, "Add a description")
    .max(2000, "That's a bit long (2000 char max)"),
  priceDollars: z.coerce
    .number()
    .min(0, "Price can't be negative")
    .max(100000, "That price seems off"),
  category: z.enum(LISTING_CATEGORIES),
  condition: z.enum(LISTING_CONDITIONS),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
