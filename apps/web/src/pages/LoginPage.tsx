import { zodResolver } from "@hookform/resolvers/zod";
import { logInSchema, type LogInInput } from "@unibuzzz/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import {
  AuthField,
  AuthLayout,
  authButtonClasses,
  authInputClasses,
} from "../components/AuthLayout";
import { DELETED_ACCOUNT_NOTICE_KEY } from "../lib/AuthProvider";
import { supabase } from "../lib/supabase";

function readAndClearDeletedNotice(): boolean {
  try {
    if (localStorage.getItem(DELETED_ACCOUNT_NOTICE_KEY) !== "1") return false;
    localStorage.removeItem(DELETED_ACCOUNT_NOTICE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [showDeletedNotice] = useState(readAndClearDeletedNotice);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LogInInput>({ resolver: zodResolver(logInSchema) });

  async function onSubmit(values: LogInInput) {
    setFormError(null);
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setFormError("Incorrect email or password.");
      return;
    }
    const from = (location.state as { from?: Location })?.from;
    navigate(from ? `${from.pathname}${from.search}` : "/", { replace: true });
  }

  return (
    <AuthLayout
      title="Log in to UniBuzzz"
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-brand-purple hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {showDeletedNotice && (
          <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
            Your account was deleted. You can create a new account any time.
          </p>
        )}

        <AuthField label="Email" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            className={authInputClasses}
            {...register("email")}
          />
        </AuthField>

        <AuthField label="Password" error={errors.password?.message}>
          <input
            type="password"
            autoComplete="current-password"
            className={authInputClasses}
            {...register("password")}
          />
        </AuthField>

        {formError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {formError}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} className={authButtonClasses}>
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>

        <p className="text-center text-sm">
          <Link to="/forgot-password" className="text-brand-purple hover:underline">
            Forgot your password?
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
