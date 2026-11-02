import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell, {
  inputClassName,
  primaryButtonClassName,
} from "../components/AuthShell";

export default function SignUpPage() {
  const { isSignedIn, signUp } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // A new account has no investor profile, so this lands on the questionnaire
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
      await signUp(form);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Next, a few questions to work out how you should invest."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/sign-in"
            className="text-accent underline underline-offset-2"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-ink mb-2"
            >
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={form.firstName}
              onChange={handleChange}
              className={inputClassName}
            />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-ink mb-2"
            >
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              value={form.lastName}
              onChange={handleChange}
              className={inputClassName}
            />
          </div>
        </div>
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
            autoComplete="new-password"
            required
            minLength={8}
            aria-describedby="password-hint"
            value={form.password}
            onChange={handleChange}
            className={inputClassName}
          />
          <p id="password-hint" className="text-muted text-sm mt-2">
            At least 8 characters
          </p>
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
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
