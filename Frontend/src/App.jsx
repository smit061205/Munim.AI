import React from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import SectionLayout from "./components/SectionLayout";
import { ToastProvider } from "./components/ui";

import LandingPage from "./pages/LandingPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import OnboardingPage from "./pages/OnboardingPage";
import TodayPage from "./pages/TodayPage";
import PortfolioPage from "./pages/PortfolioPage";
import CashFlowPage from "./pages/CashFlowPage";
import AccountsPage from "./pages/AccountsPage";
import WealthPage from "./pages/WealthPage";
import GoalsPage from "./pages/GoalsPage";
import CalculatorsPage from "./pages/CalculatorsPage";
import ReportsPage from "./pages/ReportsPage";
import TaxPage from "./pages/TaxPage";
import ImportPage from "./pages/ImportPage";
import AssistantPage from "./pages/AssistantPage";
import SettingsPage from "./pages/SettingsPage";

const MONEY_PAGES = [
  { to: "/money", label: "Transactions", end: true },
  { to: "/money/budgets", label: "Budgets" },
  { to: "/money/bills", label: "Bills and subscriptions" },
  { to: "/money/statements", label: "Statements" },
];

const WEALTH_PAGES = [
  { to: "/wealth", label: "Net worth", end: true },
  { to: "/wealth/investments", label: "Investments" },
  { to: "/wealth/accounts", label: "Accounts and loans" },
];

const PLAN_PAGES = [
  { to: "/plan", label: "Goals", end: true },
  { to: "/plan/tax", label: "Tax" },
  { to: "/plan/tools", label: "Calculators" },
];

// Addresses from before the sections, kept working for old links and emails
const OLD_CASH_FLOW_TABS = { budgets: "/money/budgets", upcoming: "/money/bills", recurring: "/money/bills", rules: "/money/rules" };

const MovedCashFlow = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const target = OLD_CASH_FLOW_TABS[params.get("tab")];
  params.delete("tab");
  const rest = params.toString();
  return <Navigate to={`${target || "/money"}${rest ? `?${rest}` : ""}`} replace />;
};

const Moved = ({ to }) => {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
};

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
              <Route path="/today" element={<TodayPage />} />

              <Route element={<SectionLayout title="Money" description="What comes in, what goes out, and what's due next." pages={MONEY_PAGES} />}>
                <Route path="/money" element={<CashFlowPage view="activity" />} />
                <Route path="/money/budgets" element={<CashFlowPage view="budgets" />} />
                <Route path="/money/bills" element={<CashFlowPage view="bills" />} />
                <Route path="/money/rules" element={<CashFlowPage view="rules" />} />
                <Route path="/money/statements" element={<ReportsPage />} />
              </Route>

              <Route element={<SectionLayout title="Wealth" description="What you own, what you owe, and how it's invested." pages={WEALTH_PAGES} />}>
                <Route path="/wealth" element={<WealthPage />} />
                <Route path="/wealth/investments" element={<PortfolioPage />} />
                <Route path="/wealth/accounts" element={<AccountsPage />} />
              </Route>

              <Route element={<SectionLayout title="Plan" description="Where you're headed, what it costs, and the tax on the way." pages={PLAN_PAGES} />}>
                <Route path="/plan" element={<GoalsPage />} />
                <Route path="/plan/tax" element={<TaxPage />} />
                <Route path="/plan/tools" element={<CalculatorsPage />} />
              </Route>

              <Route path="/import" element={<ImportPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="/home" element={<Navigate to="/today" replace />} />
            <Route path="/dashboard" element={<Navigate to="/today" replace />} />
            <Route path="/cash-flow" element={<MovedCashFlow />} />
            <Route path="/transactions" element={<Navigate to="/money" replace />} />
            <Route path="/budgets" element={<Navigate to="/money/budgets" replace />} />
            <Route path="/portfolio" element={<Moved to="/wealth/investments" />} />
            <Route path="/investments" element={<Navigate to="/wealth/investments" replace />} />
            <Route path="/accounts" element={<Moved to="/wealth/accounts" />} />
            <Route path="/goals" element={<Moved to="/plan" />} />
            <Route path="/tax" element={<Moved to="/plan/tax" />} />
            <Route path="/calculators" element={<Moved to="/plan/tools" />} />
            <Route path="/reports" element={<Moved to="/money/statements" />} />
            <Route path="/permissions" element={<Navigate to="/settings?section=privacy" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
