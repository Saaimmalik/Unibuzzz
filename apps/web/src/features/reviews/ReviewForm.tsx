import { zodResolver } from "@hookform/resolvers/zod";
import { createReviewSchema, type CreateReviewInput, type ReviewTargetType } from "@unibuzzz/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AuthField, authButtonClasses, authInputClasses } from "../../components/AuthLayout";
import { StarRating } from "./StarRating";
import { useCreateReview } from "./hooks";

export function ReviewForm({
  targetType,
  targetId,
  courseProfessors = [],
  onDone,
}: {
  targetType: ReviewTargetType;
  targetId: string;
  // Course reviews only — powers the "Who taught you?" picker, which feeds
  // the module-scoped teaching rating in course_teaching_ratings().
  courseProfessors?: { id: string; first_name: string; last_name: string }[];
  onDone: () => void;
}) {
  const createReview = useCreateReview(targetType, targetId);
  const [formError, setFormError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [interestRating, setInterestRating] = useState(0);
  const [difficultyRating, setDifficultyRating] = useState(0);
  const [workloadRating, setWorkloadRating] = useState(0);
  const [teachingRating, setTeachingRating] = useState(0);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateReviewInput>({
    resolver: zodResolver(createReviewSchema),
    defaultValues: { rating: 5, wouldRecommend: "unsure", taughtByProfessorId: "" },
  });

  const isCourse = targetType === "course";

  function pick(setter: (v: number) => void, field: keyof CreateReviewInput) {
    return (value: number) => {
      setter(value);
      setValue(field, value);
    };
  }

  async function onSubmit(values: CreateReviewInput) {
    setFormError(null);
    try {
      await createReview.mutateAsync({
        rating: values.rating,
        title: values.title || null,
        body: values.body,
        wouldRecommend:
          values.wouldRecommend === "unsure" ? null : values.wouldRecommend === "yes",
        ...(isCourse
          ? {
              interestRating: interestRating || null,
              difficultyRating: difficultyRating || null,
              workloadRating: workloadRating || null,
              teachingRating: values.taughtByProfessorId ? teachingRating || null : null,
              taughtByProfessorId: values.taughtByProfessorId || null,
            }
          : {}),
      });
      onDone();
    } catch {
      setFormError("Couldn't post that review. You may have already reviewed this one.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4"
    >
      <p className="text-xs text-stone-500">
        Your review is always posted anonymously — other students never see who wrote it.
      </p>

      <AuthField label="Overall rating" error={errors.rating?.message}>
        <StarRating value={rating} onChange={pick(setRating, "rating")} />
      </AuthField>

      {isCourse && (
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-3">
          <AuthField label="Interest">
            <StarRating value={interestRating} onChange={pick(setInterestRating, "interestRating")} size={14} />
          </AuthField>
          <AuthField label="Difficulty">
            <StarRating
              value={difficultyRating}
              onChange={pick(setDifficultyRating, "difficultyRating")}
              size={14}
            />
          </AuthField>
          <AuthField label="Workload">
            <StarRating value={workloadRating} onChange={pick(setWorkloadRating, "workloadRating")} size={14} />
          </AuthField>
          {courseProfessors.length > 0 && (
            <AuthField label="Teaching">
              <StarRating value={teachingRating} onChange={pick(setTeachingRating, "teachingRating")} size={14} />
            </AuthField>
          )}

          {courseProfessors.length > 0 && (
            <div className="col-span-2">
              <AuthField label="Who taught you? (rates their teaching for this module only)">
                <select className={authInputClasses} {...register("taughtByProfessorId")}>
                  <option value="">Not sure / prefer not to say</option>
                  {courseProfessors.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </select>
              </AuthField>
            </div>
          )}
        </div>
      )}

      <AuthField label="Title (optional)" error={errors.title?.message}>
        <input type="text" className={authInputClasses} {...register("title")} />
      </AuthField>

      <AuthField label="Your review" error={errors.body?.message}>
        <textarea
          rows={4}
          placeholder="What should other students know? (15 characters minimum)"
          className={authInputClasses}
          {...register("body")}
        />
      </AuthField>

      <AuthField label={isCourse ? "Would you recommend this module?" : "Would you recommend it?"}>
        <select className={authInputClasses} {...register("wouldRecommend")}>
          <option value="unsure">Prefer not to say</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </AuthField>

      {formError && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {formError}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className={authButtonClasses}>
        {isSubmitting ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}
