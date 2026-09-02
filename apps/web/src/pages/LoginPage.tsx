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
import { supabase } from "../lib/supabase";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
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
