import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@unibuzzz/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import {
  AuthField,
  AuthLayout,
  authButtonClasses,
  authInputClasses,
} from "../components/AuthLayout";
import { supabase } from "../lib/supabase";

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    // Always show the same message regardless of whether the email exists,
    // so this can't be used to enumerate registered accounts.
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout title="Check your inbox">
        <p className="text-center text-sm text-stone-500">
          If that email is registered, we've sent a password reset link.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      footer={
        <Link to="/login" className="font-semibold text-brand-purple hover:underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <AuthField label="Email" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            className={authInputClasses}
            {...register("email")}
          />
        </AuthField>

        <button type="submit" disabled={isSubmitting} className={authButtonClasses}>
          {isSubmitting ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthLayout>
  );
}
