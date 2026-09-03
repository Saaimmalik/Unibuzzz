import { zodResolver } from "@hookform/resolvers/zod";
import { createPostSchema, type CreatePostInput } from "@unibuzzz/shared";
import { ImagePlus, VenetianMask, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Avatar } from "../../components/Avatar";
import { useCreateCommunityPost } from "../communities/hooks";
import { useAuth } from "../../lib/auth-context";
import { useCreatePost } from "./hooks";

export function PostComposer({ communityId }: { communityId?: string } = {}) {
  const { appUser } = useAuth();
  const createPost = useCreatePost();
  const createCommunityPost = useCreateCommunityPost(communityId ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostInput>({ resolver: zodResolver(createPostSchema) });

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(values: CreatePostInput) {
    if (communityId) {
      await createCommunityPost.mutateAsync({ body: values.body, image, isAnonymous });
    } else {
      await createPost.mutateAsync({ body: values.body, image, isAnonymous });
    }
    reset();
    clearImage();
    setIsAnonymous(false);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <div className="flex gap-3">
          <Avatar displayName={appUser?.display_name ?? "?"} avatarUrl={appUser?.avatar_url} />
          <textarea
            rows={2}
            placeholder={`What's on your mind, ${appUser?.display_name?.split(" ")[0] ?? "there"}?`}
            className="w-full resize-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
            {...register("body")}
          />
        </div>
        {errors.body && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {errors.body.message}
          </p>
        )}

        {imagePreview && (
          <div className="relative w-fit">
            <img
              src={imagePreview}
              alt=""
              className="max-h-48 rounded-lg border border-stone-200"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -right-2 -top-2 rounded-full bg-brand-ink p-1 text-white"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100 hover:text-brand-purple"
            >
              <ImagePlus size={18} />
              Photo
            </button>
            <button
              type="button"
              onClick={() => setIsAnonymous((v) => !v)}
              aria-pressed={isAnonymous}
              title="Post anonymously — your name and photo won't be shown to other students"
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm ${
                isAnonymous
                  ? "bg-brand-purple/10 text-brand-purple"
                  : "text-stone-500 hover:bg-stone-100 hover:text-brand-purple"
              }`}
            >
              <VenetianMask size={18} />
              Anonymous
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-brand-yellow px-4 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-brand-orange disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Posting…" : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}
