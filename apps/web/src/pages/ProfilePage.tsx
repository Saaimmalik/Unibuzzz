import { zodResolver } from "@hookform/resolvers/zod";
import { editProfileSchema, type EditProfileInput } from "@unibuzzz/shared";
import { Camera, Pencil, UserPlus } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { AuthField, authButtonClasses, authInputClasses } from "../components/AuthLayout";
import { useUpdateProfile } from "../features/profile/hooks";
import { useAuth } from "../lib/auth-context";

export function ProfilePage() {
  const { appUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    values: appUser
      ? {
          displayName: appUser.display_name,
          bio: appUser.bio ?? "",
          major: appUser.major ?? "",
          gradYear: appUser.grad_year ?? "",
        }
      : undefined,
  });

  function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function onSubmit(values: EditProfileInput) {
    setFormError(null);
    try {
      await updateProfile.mutateAsync({
        displayName: values.displayName,
        bio: values.bio ?? "",
        major: values.major ?? "",
        gradYear: values.gradYear ?? "",
        avatar: avatarFile,
      });
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch {
      setFormError("Couldn't save your profile. Try again.");
    }
  }

  if (isEditing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative"
            aria-label="Change photo"
          >
            <Avatar
              displayName={appUser?.display_name ?? "?"}
              avatarUrl={avatarPreview ?? appUser?.avatar_url}
              size="lg"
            />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-yellow text-brand-ink">
              <Camera size={13} />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={pickAvatar}
          />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <AuthField label="Display name" error={errors.displayName?.message}>
            <input type="text" className={authInputClasses} {...register("displayName")} />
          </AuthField>

          <AuthField label="Bio" error={errors.bio?.message}>
            <textarea rows={3} className={authInputClasses} {...register("bio")} />
          </AuthField>

          <AuthField label="Major" error={errors.major?.message}>
            <input type="text" className={authInputClasses} {...register("major")} />
          </AuthField>

          <AuthField label="Graduation year" error={errors.gradYear?.message}>
            <input type="number" className={authInputClasses} {...register("gradYear")} />
          </AuthField>

          {formError && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {formError}
            </p>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className={authButtonClasses}>
              {isSubmitting ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setAvatarFile(null);
                setAvatarPreview(null);
              }}
              className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center gap-4">
        <Avatar
          displayName={appUser?.display_name ?? "?"}
          avatarUrl={appUser?.avatar_url}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-brand-ink">{appUser?.display_name}</h1>
          <p className="text-sm text-stone-500">@{appUser?.username}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
        >
          <Pencil size={14} />
          Edit
        </button>
      </div>

      {appUser?.bio && <p className="mt-4 text-sm text-brand-ink">{appUser.bio}</p>}

      <dl className="mt-6 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        <div className="flex justify-between px-4 py-3 text-sm">
          <dt className="text-stone-500">Email</dt>
          <dd className="font-medium text-brand-ink">{appUser?.email}</dd>
        </div>
        <div className="flex justify-between px-4 py-3 text-sm">
          <dt className="text-stone-500">Major</dt>
          <dd className="font-medium text-brand-ink">{appUser?.major ?? "—"}</dd>
        </div>
        <div className="flex justify-between px-4 py-3 text-sm">
          <dt className="text-stone-500">Graduation year</dt>
          <dd className="font-medium text-brand-ink">{appUser?.grad_year ?? "—"}</dd>
        </div>
      </dl>

      <Link
        to="/signup"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-brand-purple/30 bg-brand-purple/5 px-4 py-3 text-sm font-semibold text-brand-purple transition-colors hover:bg-brand-purple/10"
      >
        <UserPlus size={18} />
        Refer a friend
      </Link>
    </div>
  );
}
