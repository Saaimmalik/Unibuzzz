import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@unibuzzz/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import {
  AuthField,
  AuthLayout,
  authButtonClasses,
  authInputClasses,
} from "../components/AuthLayout";
import { supabase } from "../lib/supabase";

function friendlyAuthError(message: string): string {
  if (message.includes("UNSUPPORTED_EMAIL_DOMAIN")) {
    return "That email domain isn't supported yet — UniBuzzz currently supports @ucdconnect.ie.";
  }
  if (message.includes("USERNAME_TAKEN")) {
    return "That username is already taken.";
  }
  if (message.toLowerCase().includes("already registered")) {
    return "An account with that email already exists.";
  }
  return message;
}

export function SignUpPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  async function onSubmit(values: SignUpInput) {
    setFormError(null);

    const { data: university } = await supabase.rpc("resolve_university_for_email", {
      p_email: values.email,
    });
    if (!university) {
      setError("email", {
        message:
          "That email domain isn't supported yet — UniBuzzz currently supports @ucdconnect.ie.",
      });
      return;
    }

    const { data: usernameAvailable } = await supabase.rpc("is_username_available", {
      p_username: values.username,
    });
    if (usernameAvailable === false) {
      setError("username", { message: "That username is already taken." });
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { username: values.username, display_name: values.displayName },
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });

    if (error) {
      setFormError(friendlyAuthError(error.message));
      return;
    }

    navigate("/verify-email", { state: { email: values.email } });
  }

  return (
    <AuthLayout
      title="Join UniBuzzz"
      subtitle="Sign up with your university email — currently open to @ucdconnect.ie students."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-purple hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <AuthField label="University email" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@ucdconnect.ie"
            className={authInputClasses}
            {...register("email")}
          />
        </AuthField>

        <AuthField label="Username" error={errors.username?.message}>
          <input
            type="text"
            autoComplete="username"
            placeholder="janedoe"
            className={authInputClasses}
            {...register("username")}
          />
        </AuthField>

        <AuthField label="Display name" error={errors.displayName?.message}>
          <input
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            className={authInputClasses}
            {...register("displayName")}
          />
        </AuthField>

        <AuthField label="Password" error={errors.password?.message}>
          <input
            type="password"
            autoComplete="new-password"
            className={authInputClasses}
            {...register("password")}
          />
        </AuthField>

        <AuthField label="Confirm password" error={errors.confirmPassword?.message}>
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
          {isSubmitting ? "Creating account…" : "Sign up"}
        </button>
      </form>
    </AuthLayout>
  );
}
