import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthLayout, authButtonClasses } from "../components/AuthLayout";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";

export function VerifyEmailPage() {
  const { session, isVerified } = useAuth();
  const location = useLocation();
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const email = session?.user.email ?? (location.state as { email?: string })?.email;

  if (isVerified) return <Navigate to="/" replace />;

  async function handleResend() {
    if (!email) return;
    setResendError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/verify-email` },
    });
    if (error) {
      setResendError(error.message);
      return;
    }
    setResent(true);
  }

  return (
    <AuthLayout title="Check your inbox">
      <div className="space-y-4 text-center">
        {email ? (
          <p className="text-sm text-stone-500">
            We sent a verification link to <strong className="text-brand-ink">{email}</strong>.
            Click it to activate your account.
          </p>
        ) : (
          <p className="text-sm text-stone-500">
            We sent you a verification link. Click it to activate your account.
          </p>
        )}

        <button
          type="button"
          onClick={handleResend}
          disabled={!email}
          className={authButtonClasses}
        >
          Resend verification email
        </button>
        {resent && (
          <p role="status" className="text-sm font-medium text-brand-purple">
            Verification email resent.
          </p>
        )}
        {resendError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {resendError}
          </p>
        )}
      </div>
    </AuthLayout>
  );
}
