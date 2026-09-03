import { zodResolver } from "@hookform/resolvers/zod";
import {
  createFeedbackSchema,
  type CreateFeedbackInput,
  type FeedbackType,
} from "@unibuzzz/shared";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { AuthField, authButtonClasses, authInputClasses } from "../../components/AuthLayout";
import { useSubmitFeedback } from "./hooks";

const COPY: Record<
  FeedbackType,
  { title: string; subjectLabel: string; bodyLabel: string; placeholder: string }
> = {
  feature_request: {
    title: "Request a feature",
    subjectLabel: "What's the idea?",
    bodyLabel: "Details",
    placeholder: "What would this let you do, and why would it help?",
  },
  bug_report: {
    title: "Report a bug",
    subjectLabel: "What's broken?",
    bodyLabel: "Details",
    placeholder: "What happened? What did you expect instead? Steps to reproduce, if you can.",
  },
};

export function FeedbackDialog({ type, onClose }: { type: FeedbackType; onClose: () => void }) {
  const copy = COPY[type];
  const submitFeedback = useSubmitFeedback();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateFeedbackInput>({
    resolver: zodResolver(createFeedbackSchema),
    defaultValues: { type },
  });

  async function onSubmit(values: CreateFeedbackInput) {
    await submitFeedback.mutateAsync(values);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-brand-ink">{copy.title}</h2>
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
          <AuthField label={copy.subjectLabel} error={errors.subject?.message}>
            <input type="text" className={authInputClasses} {...register("subject")} />
          </AuthField>

          <AuthField label={copy.bodyLabel} error={errors.body?.message}>
            <textarea
              rows={5}
              placeholder={copy.placeholder}
              className={authInputClasses}
              {...register("body")}
            />
          </AuthField>

          {submitFeedback.isError && (
            <p role="alert" className="text-sm font-medium text-red-600">
              Couldn't send that. Try again.
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className={authButtonClasses}>
            {isSubmitting ? "Sending…" : "Send to UniBuzzz"}
          </button>
        </form>
      </div>
    </div>
  );
}
