import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@unibuzzz/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  AuthField,
  AuthLayout,
  authButtonClasses,
  authInputClasses,
} from "../components/AuthLayout";
import { supabase } from "../lib/supabase";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordInput) {
    setFormError(null);
    // The recovery link's tokens are picked up automatically by the
    // Supabase client on load (detectSessionInUrl), which is what makes
    // this call authorized to change the password.
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setFormError(error.message);
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <AuthField label="New password" error={errors.password?.message}>
          <input
            type="password"
            autoComplete="new-password"
            className={authInputClasses}
            {...register("password")}
          />
        </AuthField>

        <AuthField label="Confirm new password" error={errors.confirmPassword?.message}>
          <input
            type="password"
            autoComplete="new-password"
            className={authInputClasses}
            {...register("confirmPassword")}
          />
        </AuthField>

        {formError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {formError}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} className={authButtonClasses}>
          {isSubmitting ? "Saving…" : "Save new password"}
        </button>
      </form>
    </AuthLayout>
  );
}
