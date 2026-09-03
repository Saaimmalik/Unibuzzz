import type { ReportReason, ReportTargetType } from "@unibuzzz/shared";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { createReport } from "./api";

export function useCreateReport() {
  const { appUser } = useAuth();

  return useMutation({
    mutationFn: (input: {
      targetType: ReportTargetType;
      targetId: string;
      reason: ReportReason;
      details: string | null;
    }) =>
      createReport({
        universityId: appUser!.university_id,
        reporterId: appUser!.id,
        ...input,
      }),
  });
}
