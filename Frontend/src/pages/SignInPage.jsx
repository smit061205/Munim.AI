import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import AuthShell, {
  inputClassName,
  primaryButtonClassName,
} from "../components/AuthShell";

export default function SignInPage() {
  const { isSignedIn, signIn, signInDemo } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(false);

  // The server only offers the demo account in development
  useEffect(() => {
    api("/auth/demo")
      .then((data) => setDemoEnabled(!!data.enabled))
      .catch(() => setDemoEnabled(false));
  }, []);

  if (isSignedIn) {
    return <Navigate to="/today" replace />;
  }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signIn(form);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInDemo();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Pick up where you left off with your portfolio."
      footer={
        <>
          New to Munim.AI?{" "}
          <Link
            to="/sign-up"
            className="text-accent underline underline-offset-2"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-ink mb-2"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange}
            className={inputClassName}
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-ink mb-2"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={handleChange}
            className={inputClassName}
          />
        </div>

        {error && (
          <p role="alert" className="text-loss text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={primaryButtonClassName}
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {demoEnabled && (
        <div className="mt-6 pt-6 border-t border-line">
          <button
            type="button"
            onClick={handleDemo}
            disabled={submitting}
            className="w-full h-11 px-6 inline-flex items-center justify-center border border-line-strong hover:bg-wash disabled:opacity-50 disabled:cursor-not-allowed text-ink font-medium rounded-lg transition-colors"
          >
            Use the demo account
          </button>
          <p className="text-sm text-muted mt-2">
            Signs in to a shared account with sample data. Only shown while
            developing.
          </p>
        </div>
      )}
    </AuthShell>
  );
}
