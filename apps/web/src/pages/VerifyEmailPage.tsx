import { useEffect, useState } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { AuthLayout, authButtonClasses } from "../components/AuthLayout";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";

export function VerifyEmailPage() {
  const { session, isVerified } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const email = session?.user.email ?? (location.state as { email?: string })?.email;

  // The confirmation link lands here with token_hash/type in the query
  // string (see supabase/functions/auth-email) rather than pre-verified via
  // Supabase's own redirect chain — we consume the token ourselves so the
  // link isn't a plain fetchable GET that an email scanner could burn first.
  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    if (!tokenHash || type !== "signup") return;

    setVerifying(true);
    setVerifyError(null);
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: "signup" }).then(({ error }) => {
      setVerifying(false);
      if (error) {
        setVerifyError(
          "This verification link is invalid or has expired. Request a new one below.",
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
        {verifying ? (
          <p className="text-sm text-stone-500">Verifying your email…</p>
        ) : email ? (
          <p className="text-sm text-stone-500">
            We sent a verification link to <strong className="text-brand-ink">{email}</strong>.
            Click it to activate your account.
          </p>
        ) : (
          <p className="text-sm text-stone-500">
            We sent you a verification link. Click it to activate your account.
          </p>
        )}

        {verifyError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {verifyError}
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
