import React from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import { ToastProvider } from "./components/ui";

import LandingPage from "./pages/LandingPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import PortfolioPage from "./pages/PortfolioPage";
import CashFlowPage from "./pages/CashFlowPage";
import AccountsPage from "./pages/AccountsPage";
import GoalsPage from "./pages/GoalsPage";
import CalculatorsPage from "./pages/CalculatorsPage";
import ReportsPage from "./pages/ReportsPage";
import TaxPage from "./pages/TaxPage";
import AssistantPage from "./pages/AssistantPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute requireProfile={false}>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/home" element={<HomePage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/cash-flow" element={<CashFlowPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/tax" element={<TaxPage />} />
              <Route path="/calculators" element={<CalculatorsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Old addresses */}
            <Route path="/dashboard" element={<Navigate to="/home" replace />} />
            <Route path="/investments" element={<Navigate to="/portfolio" replace />} />
            <Route path="/transactions" element={<Navigate to="/cash-flow" replace />} />
            <Route path="/budgets" element={<Navigate to="/cash-flow?tab=budgets" replace />} />
            <Route path="/permissions" element={<Navigate to="/settings?section=privacy" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
