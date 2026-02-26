import React, { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { usePermissions } from "../context/PermissionsContext";
import { useAIChat } from "../context/AIChatContext";
import { motion, AnimatePresence } from "framer-motion";
import { createAuthenticatedApi } from "../services/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AIChatSidebar from "../components/AIChatSidebar";

const ReportsPage = () => {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { permissions } = usePermissions();
  const permissionsStr = JSON.stringify(permissions);
  const {
    isAIChatOpen,
    isAIChatCollapsed,
    toggleAIChat,
    toggleAIChatCollapse,
  } = useAIChat();
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creditScoreData, setCreditScoreData] = useState(null);

  useEffect(() => {
    const fetchReportData = async () => {
      console.log("🔍 ReportsPage: Starting fetchReportData");
      console.log("🔍 Clerk isLoaded:", isLoaded);
      console.log("🔍 Clerk isSignedIn:", isSignedIn);
      console.log("🔍 Permissions:", permissions);

      if (
        !isLoaded ||
        !isSignedIn ||
        !permissions ||
        Object.keys(permissions).length === 0
      ) {
        console.log("❌ Missing requirements for data fetch");
        return;
      }

      setLoading(true);
      try {
        console.log("🌐 Creating authenticated API...");
        const token = await getToken();
        console.log("🔑 Token obtained:", !!token);

        if (!token) {
          console.log("❌ Unable to get authentication token");
          return;
        }

        const authApi = createAuthenticatedApi(() => Promise.resolve(token));

        // Get allowed categories based on permissions
        const allowedCategories = [];
        if (permissions.transactions) allowedCategories.push("transactions");
        if (permissions.assets) allowedCategories.push("assets");
        if (permissions.liabilities) allowedCategories.push("liabilities");
        if (permissions.investments) allowedCategories.push("investments");

        console.log("📋 Allowed categories:", allowedCategories);

        // Fetch data from dashboard API with proper categories
        console.log("📡 Making API requests...");
        const [
          dashboardResponse,
          monthlySpendingResponse,
          spendingCategoriesResponse,
          creditScoreResponse,
        ] = await Promise.allSettled([
          authApi.get(`/dashboard?categories=${allowedCategories.join(",")}`),
          authApi.get(
            `/dashboard/monthly-spending?categories=${allowedCategories.join(
              ",",
            )}`,
          ),
          authApi.get(
            `/dashboard/spending-categories?categories=${allowedCategories.join(
              ",",
            )}`,
          ),
          authApi.get("/data/credit-score"),
        ]);

        console.log("📊 Dashboard response:", dashboardResponse);
        console.log("📊 Monthly spending response:", monthlySpendingResponse);
        console.log(
          "📊 Spending categories response:",
          spendingCategoriesResponse,
        );
        console.log("📊 Credit score response:", creditScoreResponse);

        let processedData = {
          income: 0,
          expenses: 0,
          savings: 0,
          investments: 0,
          categories: [],
        };

        if (dashboardResponse.status === "fulfilled") {
          console.log("✅ Dashboard data:", dashboardResponse.value.data);
          const dashboardData = dashboardResponse.value.data.data;
          processedData.investments = dashboardData.totalInvestments || 0;
          processedData.income = dashboardData.monthlyIncome || 0;
          processedData.expenses = dashboardData.monthlyExpenses || 0;
          processedData.savings = processedData.income - processedData.expenses;
        } else {
          console.log("❌ Dashboard request failed:", dashboardResponse.reason);
        }

        if (spendingCategoriesResponse.status === "fulfilled") {
          console.log(
            "✅ Categories data:",
            spendingCategoriesResponse.value.data,
          );
          const categoriesData = spendingCategoriesResponse.value.data.data;
          if (
            categoriesData.categories &&
            Array.isArray(categoriesData.categories)
          ) {
            processedData.categories = categoriesData.categories
              .map((cat) => ({
                name: cat.name,
                amount: cat.amount,
                percentage:
                  categoriesData.totalSpending > 0
                    ? (cat.amount / categoriesData.totalSpending) * 100
                    : 0,
              }))
              .sort((a, b) => b.amount - a.amount);
          }
        } else {
          console.log(
            "❌ Categories request failed:",
            spendingCategoriesResponse.reason,
          );
        }

        // Process credit score data
        if (creditScoreResponse.status === "fulfilled") {
          console.log("✅ Credit score data:", creditScoreResponse.value.data);
          const creditData = creditScoreResponse.value.data.data;
          const mappedCreditData = {
            score: creditData.credit_score || 0,
            utilization: creditData.credit_utilization || 0,
            paymentHistory: creditData.payment_history || "N/A",
            range:
              creditData.credit_score >= 800
                ? "Excellent"
                : creditData.credit_score >= 740
                  ? "Very Good"
                  : creditData.credit_score >= 670
                    ? "Good"
                    : creditData.credit_score >= 580
                      ? "Fair"
                      : "Poor",
            creditAge: creditData.credit_age || 24, // Default to 24 months if not provided
          };
          console.log("🎯 Mapped credit score data:", mappedCreditData);
          setCreditScoreData(mappedCreditData);
        } else {
          console.log(
            "❌ Credit score request failed:",
            creditScoreResponse.reason,
          );
        }

        console.log("📈 Final processed data:", processedData);
        setReportData(processedData);
      } catch (error) {
        console.error("❌ Error fetching report data:", error);
        console.error("❌ Error details:", {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
        setReportData({
          income: 0,
          expenses: 0,
          savings: 0,
          investments: 0,
          categories: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsStr, selectedPeriod, isLoaded, isSignedIn]);

  const currentData = reportData || {
    income: 0,
    expenses: 0,
    savings: 0,
    investments: 0,
    categories: [],
  };
  const savingsRate =
    currentData.income > 0
      ? ((currentData.savings / currentData.income) * 100).toFixed(1)
      : 0;

  const handleGenerateReport = () => {
    // TODO: Implement actual PDF generation with jsPDF or similar library
    const reportName = `Financial_Report_${selectedPeriod}_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    // Show loading state and success message
    const button = document.querySelector("[data-generate-pdf]");
    const originalText = button.textContent;
    button.textContent = "Generating...";
    button.disabled = true;

    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
      alert(
        `Report "${reportName}" generated successfully! Check your downloads folder.`,
      );
    }, 2000);
  };

  const handleAIToggle = () => {
    toggleAIChat();
  };

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-black relative">
      <Sidebar
        onAIToggle={handleAIToggle}
        isAIChatOpen={isAIChatOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      <div className="flex-1 overflow-auto bg-black">
        <Navbar
          title="Reports"
          subtitle="Generate comprehensive financial reports and insights."
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        {/* Content */}
        <div className="p-4 md:p-8 bg-black">
          {/* Report Controls */}
          {/* <div className="mb-8">
            <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-medium text-white">
                  Financial Report
                </h2>
                <div className="flex items-center space-x-4">
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-4 py-3 bg-black border border-gray-700 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: "right 0.75rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1.5em 1.5em",
                      paddingRight: "2.5rem",
                    }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <button
                    data-generate-pdf
                    onClick={handleGenerateReport}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 font-medium transition-colors"
                  >
                    Generate PDF
                  </button>
                </div>
              </div>
              <p className="text-gray-400">
                {selectedPeriod === "monthly"
                  ? "Current month"
                  : selectedPeriod === "quarterly"
                  ? "Last 3 months"
                  : "Last 12 months"}{" "}
                financial overview
              </p>
            </div>
          </div> */}

          {/* Key Metrics */}
          <div className="mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Total Income
                </h3>
                <p className="text-3xl font-semibold text-emerald-400 mb-2">
                  ₹{currentData.income.toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">
                  {selectedPeriod === "monthly"
                    ? "This month"
                    : selectedPeriod === "quarterly"
                      ? "Last 3 months"
                      : "This year"}
                </p>
              </div>
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Total Expenses
                </h3>
                <p className="text-3xl font-semibold text-red-400 mb-2">
                  ₹{currentData.expenses.toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">
                  {((currentData.expenses / currentData.income) * 100).toFixed(
                    1,
                  )}
                  % of income
                </p>
              </div>
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Net Savings
                </h3>
                <p className="text-3xl font-semibold text-white mb-2">
                  ₹{currentData.savings.toLocaleString()}
                </p>
                <p className="text-emerald-400 text-sm">
                  {savingsRate}% savings rate
                </p>
              </div>
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Investments
                </h3>
                <p className="text-3xl font-semibold text-blue-400 mb-2">
                  ₹{currentData.investments.toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">
                  {(
                    (currentData.investments / currentData.income) *
                    100
                  ).toFixed(1)}
                  % of income
                </p>
              </div>
            </div>
          </div>

          {/* Credit Score */}
          <div className="mb-8">
            <div className="bg-gray-950 border border-gray-800 shadow-xl">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-lg font-medium text-white">Credit Score</h3>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-emerald-400 mb-2">
                    {creditScoreData && creditScoreData.score}
                  </div>
                  <p className="text-gray-400">
                    {creditScoreData && creditScoreData.range}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Credit Utilization</span>
                    <span className="text-emerald-400 font-medium">
                      {creditScoreData && creditScoreData.utilization}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Payment History</span>
                    <span className="text-yellow-400 font-medium">
                      {creditScoreData && creditScoreData.paymentHistory}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Credit Age</span>
                    <span className="text-emerald-400 font-medium">
                      {creditScoreData && creditScoreData.creditAge} months
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Report Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Health Score */}
            <div className="bg-gray-950 border border-gray-800 shadow-xl">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-lg font-medium text-white">
                  Financial Health Score
                </h3>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-emerald-400 mb-2">
                    85
                  </div>
                  <p className="text-gray-400">Out of 100</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Savings Rate</span>
                    <span className="text-emerald-400 font-medium">
                      Excellent
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Expense Control</span>
                    <span className="text-yellow-400 font-medium">Good</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Investment Ratio</span>
                    <span className="text-emerald-400 font-medium">
                      Excellent
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Budget Adherence</span>
                    <span className="text-yellow-400 font-medium">Good</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-gray-950 border border-gray-800 shadow-xl">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-lg font-medium text-white">
                  Recommendations
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-emerald-400 text-lg">
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
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        Reduce Shopping Expenses
                      </p>
                      <p className="text-gray-400 text-sm">
                        Your shopping expenses are 18.6% of total expenses.
                        Consider reducing by 20% to save ₹1,700 monthly.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="text-blue-400">
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
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        Increase Investment Allocation
                      </p>
                      <p className="text-gray-400 text-sm">
                        Consider increasing your investment ratio from 28.6% to
                        35% of income for better long-term growth.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="text-yellow-400 text-lg">🎯</div>
                    <div>
                      <p className="text-white font-medium">
                        Set Stricter Budgets
                      </p>
                      <p className="text-gray-400 text-sm">
                        Create category-wise budgets for Food & Dining and
                        Entertainment to better control expenses.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAIChatOpen && (
          <div className="fixed top-0 right-0 h-full z-50">
            <AIChatSidebar
              isOpen={isAIChatOpen}
              isCollapsed={isAIChatCollapsed}
              onClose={toggleAIChat}
              onToggleCollapse={toggleAIChatCollapse}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportsPage;
