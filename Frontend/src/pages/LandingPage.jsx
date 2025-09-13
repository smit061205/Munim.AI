import { Link } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";

export default function LandingPage() {
  const { isSignedIn, isLoaded, signOut } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleSignOut = () => {
    signOut(() => {
      // Redirect to landing page after sign out
      window.location.href = "/";
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-900 text-center p-5">
      <div className="max-w-2xl">
        <h1 className="text-6xl mb-5 text-white font-bold">Munim.ai</h1>
        <p className="text-xl mb-10 text-slate-300 leading-relaxed">
          Your AI-powered financial assistant for smarter money management
        </p>

        {isSignedIn ? (
          // Show options for signed-in users
          <div className="flex flex-col gap-5 justify-center mb-15">
            <p className="text-slate-300 text-lg">
              Welcome back, {user?.firstName || "User"}!
            </p>
            <div className="flex gap-5 justify-center">
              <Link
                to="/dashboard"
                className="px-7 py-3.5 bg-emerald-600 text-white no-underline rounded-lg text-base font-semibold transition-colors duration-200 hover:bg-emerald-700"
              >
                Go to Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="px-7 py-3.5 bg-slate-600 text-white rounded-lg text-base font-semibold transition-colors duration-200 hover:bg-slate-700 border-none cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          // Show sign-in options for unauthenticated users
          <div className="flex gap-5 justify-center mb-15">
            <Link
              to="/sign-in"
              className="px-7 py-3.5 bg-blue-600 text-white no-underline rounded-lg text-base font-semibold transition-colors duration-200 hover:bg-blue-700"
            >
              Sign In
            </Link>
            <Link
              to="/sign-up"
              className="px-7 py-3.5 bg-green-600 text-white no-underline rounded-lg text-base font-semibold transition-colors duration-200 hover:bg-green-700"
            >
              Get Started
            </Link>
          </div>
        )}

        <div className="mt-15 p-8 bg-slate-800 rounded-xl border border-slate-700">
          <h3 className="text-white mb-4 text-lg font-semibold">Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            <div>
              <h4 className="text-slate-300 text-sm font-semibold flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Secure Auth</span>
              </h4>
              <p className="text-slate-400 text-xs">Powered by Clerk</p>
            </div>
            <div>
              <h4 className="text-slate-300 text-sm font-semibold flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span>AI Finance</span>
              </h4>
              <p className="text-slate-400 text-xs">Smart insights</p>
            </div>
            <div>
              <h4 className="text-slate-300 text-sm font-semibold flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span>Analytics</span>
              </h4>
              <p className="text-slate-400 text-xs">Track spending</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
