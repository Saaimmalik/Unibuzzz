import { zodResolver } from "@hookform/resolvers/zod";
import { editProfileSchema, type EditProfileInput, type ThemePreference } from "@unibuzzz/shared";
import {
  Bug,
  Camera,
  ChevronRight,
  FileText,
  Lightbulb,
  Monitor,
  Moon,
  Pencil,
  Settings as SettingsIcon,
  Sun,
  UserPlus,
} from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { AuthField, authButtonClasses, authInputClasses } from "../components/AuthLayout";
import { FeedbackDialog } from "../features/feedback/FeedbackDialog";
import { PostCard } from "../features/feed/PostCard";
import { FollowCounts } from "../features/follows/FollowCounts";
import { FollowListModal } from "../features/follows/FollowListModal";
import { useUpdateProfile, useUserPosts } from "../features/profile/hooks";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme-context";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ProfilePage() {
  const { appUser } = useAuth();
  const { preference, setPreference } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState<"feature_request" | "bug_report" | null>(
    null,
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateProfile = useUpdateProfile();
  const {
    posts,
    isLoading: postsLoading,
    hasMore,
    loadMore,
    isFetching,
    queryKey,
  } = useUserPosts(appUser?.id);

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
          degree: appUser.degree ?? "",
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
        degree: values.degree ?? "",
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
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-yellow text-black">
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

          <AuthField label="Degree" error={errors.degree?.message}>
            <input type="text" className={authInputClasses} {...register("degree")} />
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

      {appUser && (
        <FollowCounts
          followerCount={appUser.follower_count}
          followingCount={appUser.following_count}
          onShowFollowers={() => setFollowModal("followers")}
          onShowFollowing={() => setFollowModal("following")}
        />
      )}

      {appUser?.bio && <p className="mt-4 text-sm text-brand-ink">{appUser.bio}</p>}

      {followModal && appUser && (
        <FollowListModal
          userId={appUser.id}
          mode={followModal}
          onClose={() => setFollowModal(null)}
        />
      )}

      <dl className="mt-6 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        <div className="flex justify-between px-4 py-3 text-sm">
          <dt className="text-stone-500">Email</dt>
          <dd className="font-medium text-brand-ink">{appUser?.email}</dd>
        </div>
        <div className="flex justify-between px-4 py-3 text-sm">
          <dt className="text-stone-500">Degree</dt>
          <dd className="font-medium text-brand-ink">{appUser?.degree ?? "—"}</dd>
        </div>
        <div className="flex justify-between px-4 py-3 text-sm">
          <dt className="text-stone-500">Graduation year</dt>
          <dd className="font-medium text-brand-ink">{appUser?.grad_year ?? "—"}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-sm font-semibold text-brand-ink">Appearance</p>
        <p className="mt-0.5 text-xs text-stone-500">
          Choose how UniBuzzz looks. Synced to your account across devices.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPreference(value)}
              aria-pressed={preference === value}
              className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                preference === value
                  ? "border-brand-purple bg-brand-purple/10 text-brand-purple"
                  : "border-stone-200 text-stone-500 hover:bg-stone-50"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <Link
        to="/settings"
        className="mt-4 flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-brand-ink hover:bg-stone-50"
      >
        <span className="flex items-center gap-2">
          <SettingsIcon size={18} className="text-stone-500" />
          Settings
        </span>
        <ChevronRight size={16} className="text-stone-400" />
      </Link>

      <div className="mt-4 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        <button
          type="button"
          onClick={() => setFeedbackDialog("feature_request")}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-brand-ink hover:bg-stone-50"
        >
          <Lightbulb size={16} className="text-brand-purple" />
          Request a feature
        </button>
        <button
          type="button"
          onClick={() => setFeedbackDialog("bug_report")}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-brand-ink hover:bg-stone-50"
        >
          <Bug size={16} className="text-brand-purple" />
          Report a bug
        </button>
      </div>

      {feedbackDialog && (
        <FeedbackDialog type={feedbackDialog} onClose={() => setFeedbackDialog(null)} />
      )}

      <Link
        to="/signup"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-brand-purple/30 bg-brand-purple/5 px-4 py-3 text-sm font-semibold text-brand-purple transition-colors hover:bg-brand-purple/10"
      >
        <UserPlus size={18} />
        Refer a friend
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-stone-400">
        <FileText size={12} className="text-stone-300" />
        <Link to="/legal/privacy" className="hover:text-brand-purple hover:underline">
          Privacy Policy
        </Link>
        <Link to="/legal/cookies" className="hover:text-brand-purple hover:underline">
          Cookie Policy
        </Link>
        <Link to="/legal/terms" className="hover:text-brand-purple hover:underline">
          Terms of Service
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-brand-ink">Your posts</h2>
        {postsLoading && <p className="py-8 text-center text-sm text-stone-400">Loading posts…</p>}
        {!postsLoading && posts.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-400">
            You haven't posted anything yet.
          </p>
        )}
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} queryKey={queryKey} />
          ))}
        </div>
        {hasMore && posts.length > 0 && (
          <button
            type="button"
            onClick={loadMore}
            disabled={isFetching}
            className="mt-4 w-full rounded-lg border border-stone-300 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60"
          >
            {isFetching ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
