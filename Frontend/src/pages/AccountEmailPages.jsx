import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell, { inputClassName, primaryButtonClassName } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const BackToSignIn = () => (
  <>
    Remembered it?{" "}
    <Link to="/sign-in" className="text-accent underline underline-offset-2">
      Sign in
    </Link>
  </>
);

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/auth/forgot-password", { method: "POST", body: { email } });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={sent ? "Check your email" : "Reset your password"}
      subtitle={
        sent
          ? `If ${email} has an account, a reset link is on its way. It works for an hour.`
          : "Enter the email you signed up with and we'll send you a link."
      }
      footer={<BackToSignIn />}
    >
      {!sent && (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClassName} />
          </div>
          {error && <p role="alert" className="text-loss text-sm">{error}</p>}
          <button type="submit" disabled={busy} className={primaryButtonClassName}>
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const token = params.get("token");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/auth/reset-password", { method: "POST", body: { token, password } });
      navigate("/sign-in?reset=1", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Choose a new password" subtitle="At least 8 characters." footer={<BackToSignIn />}>
      {!token ? (
        <p className="text-loss">This link is missing its code. Open it again from the email, or ask for a new one.</p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-2">New password</label>
            <input id="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClassName} />
          </div>
          {error && (
            <p role="alert" className="text-loss text-sm">
              {error} <Link to="/forgot-password" className="underline">Get a new link</Link>
            </p>
          )}
          <button type="submit" disabled={busy} className={primaryButtonClassName}>
            {busy ? "Saving..." : "Save new password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const { isSignedIn, reloadUser } = useAuth();
  const [state, setState] = useState({ status: "working" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api("/auth/verify-email", { method: "POST", body: { token: params.get("token") } })
      .then(async () => {
        if (isSignedIn) await reloadUser().catch(() => {});
        setState({ status: "done" });
      })
      .catch((error) => setState({ status: "failed", message: error.message }));
  }, [params, isSignedIn, reloadUser]);

  const titles = { working: "Confirming your email", done: "Email confirmed", failed: "That link didn't work" };
  const subtitles = {
    working: "One moment.",
    done: "You'll get your weekly summary and reminders at this address.",
    failed: `${state.message || ""} You can send a new link from Settings.`,
  };

  return (
    <AuthShell
      title={titles[state.status]}
      subtitle={subtitles[state.status]}
      footer={
        <Link to={isSignedIn ? "/today" : "/sign-in"} className="text-accent underline underline-offset-2">
          {isSignedIn ? "Back to Munim" : "Sign in"}
        </Link>
      }
    />
  );
}
