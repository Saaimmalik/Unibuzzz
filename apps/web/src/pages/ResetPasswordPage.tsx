import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@unibuzzz/shared";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AuthField,
  AuthLayout,
  authButtonClasses,
  authInputClasses,
} from "../components/AuthLayout";
import { supabase } from "../lib/supabase";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  // The recovery link lands here with token_hash/type in the query string
  // (see supabase/functions/auth-email) rather than pre-verified via
  // Supabase's own redirect chain — we consume the token ourselves so the
  // link isn't a plain fetchable GET that an email scanner could burn first.
  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    if (!tokenHash || type !== "recovery") {
      setVerifying(false);
      return;
    }
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error }) => {
      setVerifying(false);
      if (error) {
        setLinkError("This reset link is invalid or has expired. Request a new one below.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function onSubmit(values: ResetPasswordInput) {
    setFormError(null);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setFormError(error.message);
      return;
    }
    navigate("/", { replace: true });
  }

  if (verifying) {
    return (
      <AuthLayout title="Choose a new password">
        <p className="text-center text-sm text-stone-500">Verifying your link…</p>
      </AuthLayout>
    );
  }

  if (linkError) {
    return (
      <AuthLayout title="Choose a new password">
        <div className="space-y-4 text-center">
          <p role="alert" className="text-sm font-medium text-red-600">
            {linkError}
          </p>
          <Link to="/forgot-password" className={authButtonClasses}>
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
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
