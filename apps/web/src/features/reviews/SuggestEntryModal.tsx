import { zodResolver } from "@hookform/resolvers/zod";
import {
  suggestCourseSchema,
  suggestProfessorSchema,
  type SuggestCourseInput,
  type SuggestProfessorInput,
} from "@unibuzzz/shared";
import { X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AuthField, authButtonClasses, authInputClasses } from "../../components/AuthLayout";
import { useSuggestCourse, useSuggestProfessor } from "./hooks";

function SuggestProfessorForm({ onDone }: { onDone: () => void }) {
  const suggestProfessor = useSuggestProfessor();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SuggestProfessorInput>({ resolver: zodResolver(suggestProfessorSchema) });

  async function onSubmit(values: SuggestProfessorInput) {
    await suggestProfessor.mutateAsync(values);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      <AuthField label="First name" error={errors.firstName?.message}>
        <input type="text" className={authInputClasses} {...register("firstName")} />
      </AuthField>
      <AuthField label="Last name" error={errors.lastName?.message}>
        <input type="text" className={authInputClasses} {...register("lastName")} />
      </AuthField>
      <AuthField label="Department" error={errors.department?.message}>
        <input type="text" className={authInputClasses} {...register("department")} />
      </AuthField>
      {suggestProfessor.isError && (
        <p role="alert" className="text-sm font-medium text-red-600">
          Couldn't submit that suggestion. Try again.
        </p>
      )}
      <button type="submit" disabled={isSubmitting} className={authButtonClasses}>
        {isSubmitting ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}

function SuggestCourseForm({ onDone }: { onDone: () => void }) {
  const suggestCourse = useSuggestCourse();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SuggestCourseInput>({ resolver: zodResolver(suggestCourseSchema) });

  async function onSubmit(values: SuggestCourseInput) {
    await suggestCourse.mutateAsync(values);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      <AuthField label="Module code" error={errors.code?.message}>
        <input type="text" placeholder="e.g. COMP10060" className={authInputClasses} {...register("code")} />
      </AuthField>
      <AuthField label="Title" error={errors.title?.message}>
        <input type="text" className={authInputClasses} {...register("title")} />
      </AuthField>
      <AuthField label="Department" error={errors.department?.message}>
        <input type="text" className={authInputClasses} {...register("department")} />
      </AuthField>
      {suggestCourse.isError && (
        <p role="alert" className="text-sm font-medium text-red-600">
          Couldn't submit that suggestion. Try again.
        </p>
      )}
      <button type="submit" disabled={isSubmitting} className={authButtonClasses}>
        {isSubmitting ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}

export function SuggestEntryModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"professor" | "course">("professor");
  const [done, setDone] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-brand-ink">Suggest a new entry</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="py-4 text-center">
            <p className="text-sm text-brand-ink">
              Thanks! A moderator will review this before it's added, to keep the catalog free of
              duplicates.
            </p>
            <button type="button" onClick={onClose} className={`${authButtonClasses} mt-4`}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setTab("professor")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "professor" ? "bg-brand-ink text-white" : "text-stone-500 hover:bg-stone-100"}`}
              >
                Professor
              </button>
              <button
                type="button"
                onClick={() => setTab("course")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "course" ? "bg-brand-ink text-white" : "text-stone-500 hover:bg-stone-100"}`}
              >
                Course
              </button>
            </div>
            {tab === "professor" ? (
              <SuggestProfessorForm onDone={() => setDone(true)} />
            ) : (
              <SuggestCourseForm onDone={() => setDone(true)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
