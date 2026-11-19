import React, { useCallback, useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { lockCredential, unlockApp } from "../lib/appLock";
import { Logo } from "./Logo";

// Locks again after Munim has been in the background this long
const RELOCK_MS = 2 * 60 * 1000;

export default function AppLock() {
  const { signOut } = useAuth();
  const [locked, setLocked] = useState(() => !!lockCredential());
  const [error, setError] = useState(null);
  const hiddenAt = useRef(null);

  const unlock = useCallback(async () => {
    setError(null);
    try {
      await unlockApp();
      setLocked(false);
    } catch {
      setError("That didn't work. Try again.");
    }
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) hiddenAt.current = Date.now();
      else if (lockCredential() && hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_MS) setLocked(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!locked) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-canvas flex flex-col items-center justify-center px-6 text-center">
      <Logo className="text-lg mb-10" />
      <Lock size={28} className="text-muted mb-4" />
      <h1 className="text-xl font-semibold mb-1">Munim is locked</h1>
      <p className="text-muted mb-6">Unlock with your face, fingerprint or device PIN.</p>
      <button
        type="button"
        autoFocus
        onClick={unlock}
        className="h-11 px-6 rounded-lg bg-accent text-canvas font-medium hover:bg-accent-hover"
      >
        Unlock
      </button>
      {error && <p className="text-loss text-sm mt-3" role="alert">{error}</p>}
      <button type="button" onClick={signOut} className="text-sm text-muted hover:text-ink mt-8">
        Sign out instead
      </button>
    </div>
  );
}
