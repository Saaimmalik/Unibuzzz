import { useMutation } from "@tanstack/react-query";
import type { FeedbackType } from "@unibuzzz/shared";
import { useAuth } from "../../lib/auth-context";
import { submitFeedback } from "./api";

export function useSubmitFeedback() {
  const { appUser } = useAuth();
  return useMutation({
    mutationFn: (input: { type: FeedbackType; subject: string; body: string }) =>
      submitFeedback({
        universityId: appUser!.university_id,
        userId: appUser!.id,
        type: input.type,
        subject: input.subject,
        body: input.body,
      }),
  });
}
