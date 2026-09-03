import { zodResolver } from "@hookform/resolvers/zod";
import {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  deleteAccountSchema,
  type DeleteAccountInput,
} from "@unibuzzz/shared";
import {
  Bell,
  ChevronLeft,
  Download,
  KeyRound,
  ShieldBan,
  Trash2,
  UserCog,
  UserX,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { AuthField, authInputClasses } from "../components/AuthLayout";
import { ConfirmActionDialog } from "../features/settings/ConfirmActionDialog";
import { SettingsCard, SettingsNavRow } from "../features/settings/SettingsUI";
import {
  useDeactivateAccount,
  useDeleteAccount,
  useDownloadMyData,
} from "../features/settings/hooks";
import { useAuth } from "../lib/auth-context";

export function SettingsPage() {
  const { appUser, signOut } = useAuth();
  const navigate = useNavigate();

  const downloadMyData = useDownloadMyData();
  const deactivateAccount = useDeactivateAccount();
  const deleteAccount = useDeleteAccount();

  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  const {
    register: registerDelete,
    handleSubmit: handleDeleteSubmit,
    formState: { errors: deleteErrors },
    reset: resetDeleteForm,
  } = useForm<DeleteAccountInput>({ resolver: zodResolver(deleteAccountSchema) });

  async function onConfirmDeactivate() {
    await deactivateAccount.mutateAsync();
    await signOut();
    navigate("/login", { replace: true });
  }

  async function onConfirmDelete() {
    await deleteAccount.mutateAsync();
    await signOut();
    navigate("/login", { replace: true });
  }

  async function onDownloadData() {
    setDownloadError(false);
    try {
      await downloadMyData.mutateAsync();
    } catch {
      setDownloadError(true);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <div className="flex items-center gap-2">
        <Link
          to="/profile"
          className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
          aria-label="Back to profile"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-brand-ink">Settings</h1>
      </div>

      <SettingsCard
        title="Account"
        description="Your profile details are managed from your Profile page."
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-ink">{appUser?.display_name}</p>
            <p className="truncate text-xs text-stone-500">{appUser?.email}</p>
          </div>
          <Link
            to="/profile"
            className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
          >
            Edit profile
          </Link>
        </div>
      </SettingsCard>

      <div className="space-y-2">
        <SettingsNavRow icon={KeyRound} label="Change password" to="/settings/change-password" />
        <SettingsNavRow
          icon={UserCog}
          label="Privacy"
          description="Who can message you, profile visibility"
          to="/settings/privacy"
        />
        <SettingsNavRow
          icon={ShieldBan}
          label="Blocked users"
          description="Manage people you've blocked"
          to="/settings/blocked-users"
        />
        <SettingsNavRow
          icon={Bell}
          label="Email preferences"
          description="Choose what UniBuzzz emails you about"
          to="/settings/email-preferences"
        />
      </div>

      <SettingsCard title="Your data">
        <button
          type="button"
          onClick={onDownloadData}
          disabled={downloadMyData.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60"
        >
          <Download size={16} />
          {downloadMyData.isPending ? "Preparing…" : "Download my data"}
        </button>
        {downloadError && (
          <p role="alert" className="mt-2 text-sm font-medium text-red-600">
            Couldn't prepare your export. Try again.
          </p>
        )}
      </SettingsCard>

      <SettingsCard title="Danger zone">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setConfirmingDeactivate(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100"
          >
            <UserX size={16} />
            Deactivate account
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
          >
            <Trash2 size={16} />
            Delete account
          </button>
        </div>
      </SettingsCard>

      {confirmingDeactivate && (
        <ConfirmActionDialog
          title="Deactivate your account?"
          description="Your profile and content will be hidden from other students. Logging back in reactivates your account automatically."
          confirmLabel="Deactivate"
          destructive={false}
          isPending={deactivateAccount.isPending}
          onCancel={() => setConfirmingDeactivate(false)}
          onConfirm={() => void onConfirmDeactivate()}
        >
          {deactivateAccount.isError && (
            <p role="alert" className="text-sm font-medium text-red-600">
              Something went wrong. Try again.
            </p>
          )}
        </ConfirmActionDialog>
      )}

      {confirmingDelete && (
        <ConfirmActionDialog
          title="Delete your account?"
          description="This can't be undone. Your profile will be permanently anonymized and you'll be signed out everywhere. Content you've posted stays up, attributed to “Deleted User”."
          confirmLabel="Delete permanently"
          isPending={deleteAccount.isPending}
          disabled={!!deleteErrors.confirmation}
          onCancel={() => {
            setConfirmingDelete(false);
            resetDeleteForm();
          }}
          onConfirm={handleDeleteSubmit(onConfirmDelete)}
        >
          <form onSubmit={(e) => e.preventDefault()}>
            <AuthField
              label={`Type ${DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm`}
              error={deleteErrors.confirmation?.message}
            >
              <input type="text" className={authInputClasses} {...registerDelete("confirmation")} />
            </AuthField>
          </form>
          {deleteAccount.isError && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600">
              Something went wrong. Try again.
            </p>
          )}
        </ConfirmActionDialog>
      )}
    </div>
  );
}
