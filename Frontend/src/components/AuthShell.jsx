import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "./AppLayout";

export const inputClassName =
  "w-full h-11 px-3 bg-surface border border-line-strong rounded-lg text-ink placeholder:text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors";

export const primaryButtonClassName =
  "w-full h-11 px-6 inline-flex items-center justify-center bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-canvas font-medium rounded-lg transition-colors";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-block mb-10">
          <Logo className="text-lg" />
        </Link>

        <h1 className="font-display text-4xl leading-tight mb-2">{title}</h1>
        <p className="text-muted mb-8">{subtitle}</p>

        {children}

        <p className="text-muted text-sm mt-8">{footer}</p>
      </div>
    </div>
  );
}
