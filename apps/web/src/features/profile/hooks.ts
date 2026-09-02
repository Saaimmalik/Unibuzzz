import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { POSTS_QUERY_KEY } from "../feed/api";
import { updateProfile, uploadAvatar } from "./api";

export function useUpdateProfile() {
  const { appUser, refreshAppUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      displayName: string;
      bio: string;
      degree: string;
      gradYear: number | "";
      avatar?: File | null;
    }) => {
      let avatarUrl: string | undefined;
      if (input.avatar) {
        avatarUrl = await uploadAvatar(appUser!.university_id, appUser!.id, input.avatar);
      }

      await updateProfile(appUser!.id, {
        display_name: input.displayName,
        bio: input.bio || null,
        degree: input.degree || null,
        grad_year: input.gradYear === "" ? null : input.gradYear,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      });
    },
    onSuccess: async () => {
      await refreshAppUser();
      // Posts already cache the author's stale display_name/avatar_url —
      // refetch so an edited profile shows correctly on past posts too.
      void queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
  });
}
