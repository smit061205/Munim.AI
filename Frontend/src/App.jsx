import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { PermissionsProvider } from "./context/PermissionsContext";
import { AIChatProvider, useAIChat } from "./context/AIChatContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Import pages
import LandingPage from "./pages/LandingPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import DashboardPage from "./pages/DashboardPage";
import TransactionsPage from "./pages/TransactionsPage";
import AccountsPage from "./pages/AccountsPage";
import BudgetsPage from "./pages/BudgetsPage";
import InvestmentsPage from "./pages/InvestmentsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import PermissionsPage from "./pages/PermissionsPage";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing Publishable Key");
}

// Floating AI Button Component
const FloatingAIButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAIChatOpen, openAIChat } = useAIChat();

  // Hide button when AI chat is open
  if (isAIChatOpen) {
    return null;
  }

  // Only show on protected routes (dashboard and other app pages)
  const protectedRoutes = [
    "/dashboard",
    "/transactions",
    "/accounts",
    "/budgets",
    "/investments",
    "/reports",
    "/settings",
    "/permissions",
  ];
  const isProtectedRoute = protectedRoutes.some((route) =>
    location.pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return null;
  }

  return (
    <button
      onClick={() => openAIChat()}
      className="fixed bottom-8 right-8 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-full shadow-2xl transition-all duration-300 z-50 hover:scale-105 flex items-center space-x-2"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <span className="font-medium">Ask Munimji</span>
    </button>
  );
};

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <PermissionsProvider>
        <AIChatProvider>
          <Router>
            <div className="min-h-screen bg-black">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/sign-in" element={<SignInPage />} />
                <Route path="/sign-up" element={<SignUpPage />} />

                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transactions"
                  element={
                    <ProtectedRoute>
                      <TransactionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/accounts"
                  element={
                    <ProtectedRoute>
                      <AccountsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/budgets"
                  element={
                    <ProtectedRoute>
                      <BudgetsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/investments"
                  element={
                    <ProtectedRoute>
                      <InvestmentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <ReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/permissions"
                  element={
                    <ProtectedRoute>
                      <PermissionsPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>

              {/* Global floating AI assistant button */}
              <FloatingAIButton />
            </div>
          </Router>
        </AIChatProvider>
      </PermissionsProvider>
    </ClerkProvider>
  );
}

export default App;
