import { zodResolver } from "@hookform/resolvers/zod";
import { createCommunitySchema, type CreateCommunityInput } from "@unibuzzz/shared";
import { CheckCircle2, Lock, Plus, Users } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { AuthField, authButtonClasses, authInputClasses } from "../components/AuthLayout";
import { useCommunities, useCreateCommunity } from "../features/communities/hooks";

export function CommunitiesPage() {
  const { data: communities, isLoading } = useCommunities();
  const createCommunity = useCreateCommunity();
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCommunityInput>({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: { type: "public" },
  });

  async function onSubmit(values: CreateCommunityInput) {
    setFormError(null);
    try {
      await createCommunity.mutateAsync({
        name: values.name,
        description: values.description ?? "",
        type: values.type,
      });
      reset();
      setIsCreating(false);
      setSubmitted(true);
    } catch {
      setFormError("Couldn't submit that request. Try a different name.");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-brand-ink">Communities</h1>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setIsCreating((v) => !v);
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-yellow px-3 py-1.5 text-sm font-semibold text-black hover:bg-brand-orange"
        >
          <Plus size={16} />
          Request New Community
        </button>
      </div>

      {submitted && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>
            Your community request has been submitted for admin approval. You'll be able to find it
            here once it's approved.
          </p>
        </div>
      )}

      {isCreating && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4"
        >
          <AuthField label="Name" error={errors.name?.message}>
            <input type="text" className={authInputClasses} {...register("name")} />
          </AuthField>
          <AuthField label="Description" error={errors.description?.message}>
            <textarea rows={2} className={authInputClasses} {...register("description")} />
          </AuthField>
          <AuthField label="Visibility">
            <select className={authInputClasses} {...register("type")}>
              <option value="public">Public — anyone in the university can read it</option>
              <option value="restricted">Restricted — only members can see posts</option>
            </select>
          </AuthField>
          {formError && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {formError}
            </p>
          )}
          <button type="submit" disabled={isSubmitting} className={authButtonClasses}>
            {isSubmitting ? "Requesting…" : "Request new community"}
          </button>
        </form>
      )}

      {isLoading && <p className="py-8 text-center text-sm text-stone-400">Loading communities…</p>}
      {!isLoading && communities?.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-400">
          No communities yet — create the first one 🐝
        </p>
      )}

      <ul className="space-y-2">
        {communities?.map((community) => (
          <li key={community.id}>
            <Link
              to={`/c/${community.slug}`}
              className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 hover:border-brand-purple/40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
                <Users size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-brand-ink">{community.name}</p>
                  {community.type === "restricted" && (
                    <Lock size={12} className="shrink-0 text-stone-400" />
                  )}
                </div>
                {community.description && (
                  <p className="truncate text-xs text-stone-500">{community.description}</p>
                )}
                <p className="mt-1 text-xs text-stone-400">
                  {community.member_count} {community.member_count === 1 ? "member" : "members"}
                </p>
              </div>
              {community.viewer_role && (
                <span className="shrink-0 rounded-full bg-brand-yellow/20 px-2 py-1 text-xs font-semibold text-brand-ink">
                  Joined
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
