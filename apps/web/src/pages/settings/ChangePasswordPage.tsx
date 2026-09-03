import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@unibuzzz/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AuthField, authButtonClasses, authInputClasses } from "../../components/AuthLayout";
import { SettingsCard, SettingsSubpageHeader } from "../../features/settings/SettingsUI";
import { useChangePassword } from "../../features/settings/hooks";

export function ChangePasswordPage() {
  const changePassword = useChangePassword();
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordInput) {
    setPasswordSuccess(false);
    await changePassword.mutateAsync(values.password);
    setPasswordSuccess(true);
    reset();
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <SettingsSubpageHeader title="Change password" backTo="/settings" />

      <SettingsCard>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
          <AuthField label="New password" error={errors.password?.message}>
            <input type="password" className={authInputClasses} {...register("password")} />
          </AuthField>
          <AuthField label="Confirm new password" error={errors.confirmPassword?.message}>
            <input type="password" className={authInputClasses} {...register("confirmPassword")} />
          </AuthField>
          {changePassword.isError && (
            <p role="alert" className="text-sm font-medium text-red-600">
              Couldn't update your password. Try again.
            </p>
          )}
          {passwordSuccess && (
            <p className="text-sm font-medium text-emerald-600">Password updated.</p>
          )}
          <button type="submit" disabled={isSubmitting} className={authButtonClasses}>
            {isSubmitting ? "Updating…" : "Update password"}
          </button>
        </form>
      </SettingsCard>
    </div>
  );
}
