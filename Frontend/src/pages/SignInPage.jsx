import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell, {
  inputClassName,
  primaryButtonClassName,
} from "../components/AuthShell";

export default function SignInPage() {
  const { isSignedIn, signIn } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (isSignedIn) {
    return <Navigate to="/home" replace />;
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
    </AuthShell>
  );
}
