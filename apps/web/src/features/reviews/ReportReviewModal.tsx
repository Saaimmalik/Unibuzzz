import { zodResolver } from "@hookform/resolvers/zod";
import {
  reportReviewSchema,
  REVIEW_REPORT_REASONS,
  type ReportReviewInput,
} from "@unibuzzz/shared";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { AuthField, authButtonClasses, authInputClasses } from "../../components/AuthLayout";
import { useReportReview } from "./hooks";

const REASON_LABELS: Record<string, string> = {
  harassment: "Harassment or personal attack",
  personal_info: "Contains personal info (doxxing)",
  spam: "Spam or advertising",
  off_topic: "Off-topic / not about the module or professor",
  fake: "Fake or not a real student experience",
  other: "Other",
};

export function ReportReviewModal({
  reviewId,
  onClose,
}: {
  reviewId: string;
  onClose: () => void;
}) {
  const reportReview = useReportReview();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReportReviewInput>({
    resolver: zodResolver(reportReviewSchema),
    defaultValues: { reason: "harassment" },
  });

  async function onSubmit(values: ReportReviewInput) {
    await reportReview.mutateAsync({
      reviewId,
      reason: values.reason,
      details: values.details || null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-brand-ink">Report this review</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
          <AuthField label="Reason">
            <select className={authInputClasses} {...register("reason")}>
              {REVIEW_REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </AuthField>

          <AuthField label="Details (optional)" error={errors.details?.message}>
            <textarea rows={3} className={authInputClasses} {...register("details")} />
          </AuthField>

          {reportReview.isError && (
            <p role="alert" className="text-sm font-medium text-red-600">
              Couldn't submit that report. Try again.
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className={authButtonClasses}>
            {isSubmitting ? "Reporting…" : "Submit report"}
          </button>
        </form>
      </div>
    </div>
  );
}
