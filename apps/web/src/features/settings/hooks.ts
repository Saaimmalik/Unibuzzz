import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import {
  changePassword,
  deactivateAccount,
  deleteAccount,
  downloadMyData,
  reactivateAccount,
  updateEmailPreferences,
  updatePrivacySettings,
  type EmailPreferences,
  type PrivacySettings,
} from "./api";

export function useUpdateEmailPreferences() {
  const { appUser, refreshAppUser } = useAuth();
  return useMutation({
    mutationFn: (prefs: Partial<EmailPreferences>) => updateEmailPreferences(appUser!.id, prefs),
    onSuccess: () => refreshAppUser(),
  });
}

export function useUpdatePrivacySettings() {
  const { appUser, refreshAppUser } = useAuth();
  return useMutation({
    mutationFn: (settings: Partial<PrivacySettings>) =>
      updatePrivacySettings(appUser!.id, settings),
    onSuccess: () => refreshAppUser(),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: (newPassword: string) => changePassword(newPassword) });
}

export function useDeactivateAccount() {
  const { refreshAppUser } = useAuth();
  return useMutation({
    mutationFn: deactivateAccount,
    onSuccess: () => refreshAppUser(),
  });
}

export function useReactivateAccount() {
  const { refreshAppUser } = useAuth();
  return useMutation({
    mutationFn: reactivateAccount,
    onSuccess: () => refreshAppUser(),
  });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: deleteAccount });
}

export function useDownloadMyData() {
  return useMutation({ mutationFn: downloadMyData });
}
