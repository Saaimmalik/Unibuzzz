import { z } from "zod";

// Typed-confirmation guard for the irreversible "Delete account" flow —
// same "make destructive actions hard to trigger by accident" idea as the
// admin dashboard's ConfirmDialog, just stronger since this one has no
// staff undo path.
export const DELETE_ACCOUNT_CONFIRMATION_PHRASE = "DELETE";

export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine((value): boolean => value === DELETE_ACCOUNT_CONFIRMATION_PHRASE, {
      message: `Type ${DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm`,
    }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
