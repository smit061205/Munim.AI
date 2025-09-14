import React, { useState, useEffect, useMemo } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { usePermissions } from "../context/PermissionsContext";
import { useAIChat } from "../context/AIChatContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  createAuthenticatedApi,
  fetchDashboard,
  fetchMonthlySpending,
  fetchNetWorthTimeline,
  fetchSpendingCategories,
} from "../services/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AIChatSidebar from "../components/AIChatSidebar";
import ExpenseChart from "../components/Charts/ExpenseChart";
import InvestmentChart from "../components/Charts/InvestmentChart";
import NetWorthChart from "../components/Charts/NetWorthChart";

const DashboardPage = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { permissions, getAllowedCategories } = usePermissions();
  const {
    isAIChatOpen,
    isAIChatCollapsed,
    toggleAIChat,
    toggleAIChatCollapse,
  } = useAIChat();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [monthlySpending, setMonthlySpending] = useState(null);
  const [netWorthData, setNetWorthData] = useState(null);
  const [spendingCategories, setSpendingCategories] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState("1M");

  // Filter data by time period
  const filterDataByTimePeriod = (data, period) => {
    const now = new Date();
    let startDate;

    switch (period) {
      case "1M":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        );
        break;
      case "3M":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate()
        );
        break;
      case "1Y":
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        break;
      default:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        );
    }

    // Handle different data structures from backend
    return {
      expenses: Array.isArray(data.expenses)
        ? data.expenses.filter((item) => new Date(item.date) >= startDate)
        : data.expenses?.monthlyData?.filter(
            (item) => new Date(item.month) >= startDate
          ) || [],
      netWorth: Array.isArray(data.netWorth)
        ? data.netWorth.filter((item) => new Date(item.date) >= startDate)
        : data.netWorth?.monthlyData?.filter(
            (item) => new Date(item.month) >= startDate
          ) || [],
      transactions: Array.isArray(data.transactions)
        ? data.transactions.filter((item) => new Date(item.date) >= startDate)
        : [],
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!getAllowedCategories().length > 0) return;

      setLoading(true);
      try {
        const token = await getToken();
        const authApi = createAuthenticatedApi(() => Promise.resolve(token));

        // Get allowed categories based on permissions
        const allowedCategories = getAllowedCategories();

        console.log(
          "🔍 Fetching dashboard data with categories:",
          allowedCategories
        );

        // Fetch data from multiple endpoints
        const [
          dashboardResponse,
          monthlySpendingResponse,
          netWorthResponse,
          spendingCategoriesResponse,
        ] = await Promise.allSettled([
          fetchDashboard(authApi, allowedCategories),
          fetchMonthlySpending(authApi, allowedCategories),
          fetchNetWorthTimeline(authApi, allowedCategories),
          fetchSpendingCategories(authApi, allowedCategories),
        ]);

        // Process dashboard data
        if (dashboardResponse.status === "fulfilled") {
          console.log("✅ Dashboard data:", dashboardResponse.value.data);
          setDashboardData(dashboardResponse.value.data.data);
        }

        // Process monthly spending data
        if (monthlySpendingResponse.status === "fulfilled") {
          console.log(
            "✅ Monthly spending data:",
            monthlySpendingResponse.value.data
          );
          setMonthlySpending(monthlySpendingResponse.value.data.data);
        }

        // Process net worth data
        if (netWorthResponse.status === "fulfilled") {
          console.log("✅ Net worth data:", netWorthResponse.value.data);
          setNetWorthData(netWorthResponse.value.data.data);
        }

        // Process spending categories data
        if (spendingCategoriesResponse.status === "fulfilled") {
          console.log(
            "✅ Spending categories data:",
            spendingCategoriesResponse.value.data
          );
          setSpendingCategories(spendingCategoriesResponse.value.data.data);
        }

        // Initialize filtered data with default 1M period
        const allData = {
          expenses:
            monthlySpendingResponse.status === "fulfilled"
              ? monthlySpendingResponse.value.data.data || []
              : [],
          netWorth:
            netWorthResponse.status === "fulfilled"
              ? netWorthResponse.value.data.data || []
              : [],
          transactions:
            dashboardResponse.status === "fulfilled"
              ? dashboardResponse.value.data.data.transactions || []
              : [],
        };

        const filtered = filterDataByTimePeriod(allData, selectedTimePeriod);
        setFilteredData(filtered);
      } catch (error) {
        console.error("❌ Error fetching dashboard data:", error);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    if (getAllowedCategories().length > 0) {
      fetchData();
    }
  }, [permissions, selectedTimePeriod]);

  // Calculate totals from backend data
  const calculateTotals = useMemo(() => {
    if (!dashboardData) {
      return {
        totalAssets: 0,
        totalLiabilities: 0,
        totalInvestments: 0,
        netWorth: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
      };
    }

    console.log("🔍 calculateTotals - dashboardData:", dashboardData);

    return {
      totalAssets: dashboardData.totalAssets || 0,
      totalLiabilities: dashboardData.totalLiabilities || 0,
      totalInvestments: dashboardData.totalInvestments || 0,
      netWorth: dashboardData.netWorth || 0, // Now a simple number from backend
      monthlyIncome: dashboardData.monthlyIncome || 0,
      monthlyExpenses: dashboardData.monthlyExpenses || 0,
    };
  }, [dashboardData]);

  const {
    totalAssets,
    totalLiabilities,
    totalInvestments,
    netWorth,
    monthlyIncome,
    monthlyExpenses,
  } = calculateTotals;

  // Get recent transactions from dashboard data
  const recentTransactions =
    dashboardData?.recentTransactions ||
    dashboardData?.monthlySpending?.recentTransactions ||
    [];

  if (loading) {
    return (
      <div className="flex h-screen bg-black">
        <Sidebar
          onAIToggle={toggleAIChat}
          isAIChatOpen={isAIChatOpen}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-lg">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black relative">
      <Sidebar
        onAIToggle={toggleAIChat}
        isAIChatOpen={isAIChatOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <div className="flex-1 overflow-auto bg-black">
        <Navbar
          title="Dashboard"
          subtitle="Welcome back, here's an overview of your financial health."
        />

        {error && (
          <div className="p-4 mx-8 mt-4 bg-red-900/20 border border-red-800 text-red-300 rounded">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="p-8 bg-black">
          {/* Overview Cards */}
          <div className="mb-8">
            <h2 className="text-xl font-medium text-white mb-6">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Net Worth
                </h3>
                <p className="text-3xl font-semibold text-white mb-2">
                  ₹{netWorth.toLocaleString()}
                </p>
                <p className="text-emerald-400 text-sm font-medium">
                  {dashboardData?.netWorthChange || "↗ +1.2%"}
                </p>
              </div>
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Saved Income
                </h3>
                <p className="text-3xl font-semibold text-white mb-2">
                  ₹{monthlyIncome.toLocaleString()}
                </p>
                <p className="text-red-400 text-sm font-medium">
                  {dashboardData?.incomeChange || "↘ -0.5%"}
                </p>
              </div>
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Expenses
                </h3>
                <p className="text-3xl font-semibold text-white mb-2">
                  ₹{monthlyExpenses.toLocaleString()}
                </p>
                <p className="text-emerald-400 text-sm font-medium">
                  {dashboardData?.expenseChange || "↗ +2.1%"}
                </p>
              </div>
            </div>
          </div>

          {/* Spending Analysis */}
          <div className="mb-8">
            <h2 className="text-xl font-medium text-white mb-6">
              Spending Analysis
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Spending Over Time Chart */}
              <div className="lg:col-span-2 bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">
                    Spending Over Time
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedTimePeriod("1M");
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium"
                    >
                      1M
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTimePeriod("3M");
                      }}
                      className="px-4 py-2 bg-gray-800 text-gray-300 text-sm font-medium hover:bg-gray-700"
                    >
                      3M
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTimePeriod("1Y");
                      }}
                      className="px-4 py-2 bg-gray-800 text-gray-300 text-sm font-medium hover:bg-gray-700"
                    >
                      1Y
                    </button>
                  </div>
                </div>
                <p className="text-2xl font-medium text-white mb-4">
                  ₹{filteredData?.expenses?.total?.toLocaleString()}
                </p>
                {monthlySpending && (
                  <ExpenseChart
                    data={monthlySpending}
                    transactions={dashboardData?.transactions || []}
                  />
                )}
              </div>

              {/* Spending by Category */}
              <div className="bg-gray-950 border border-gray-800 shadow-xl flex justify-center flex-col items-center">
                <h3 className="text-lg font-medium text-white mb-8 text-center -mt-5">
                  Spending by Category
                </h3>
                {spendingCategories &&
                spendingCategories.categories &&
                spendingCategories.categories.length > 0 ? (
                  <InvestmentChart data={spendingCategories} />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    No spending data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Net Worth Chart */}
          <div className="mb-8">
            <h2 className="text-xl font-medium text-white mb-6">Net Worth</h2>
            <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
              {filteredData?.netWorth && (
                <NetWorthChart
                  data={filteredData.netWorth}
                  totalAssets={totalAssets}
                  totalLiabilities={totalLiabilities}
                  totalInvestments={totalInvestments}
                  netWorth={netWorth}
                />
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <h2 className="text-xl font-medium text-white mb-6">
              Recent Transactions
            </h2>
            <div className="bg-gray-950 border border-gray-800 overflow-hidden shadow-xl rounded-lg">
              {recentTransactions && recentTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-6 py-4 text-left text-gray-300 font-medium uppercase tracking-wide text-sm">
                          Description
                        </th>
                        <th className="px-6 py-4 text-left text-gray-300 font-medium uppercase tracking-wide text-sm">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-left text-gray-300 font-medium uppercase tracking-wide text-sm">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-gray-300 font-medium uppercase tracking-wide text-sm">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {recentTransactions
                        .slice(0, 10)
                        .map((transaction, index) => (
                          <tr
                            key={transaction.id || index}
                            className="hover:bg-gray-900 transition-colors duration-200"
                          >
                            <td className="px-6 py-4 text-white font-medium">
                              {transaction.description ||
                                transaction.title ||
                                "N/A"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`font-semibold ${
                                  transaction.amount >= 0
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {transaction.amount >= 0 ? "+" : ""}₹
                                {Math.abs(transaction.amount).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                                {transaction.category || "Other"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-400 text-sm">
                              {transaction.date
                                ? new Date(
                                    transaction.date
                                  ).toLocaleDateString()
                                : "N/A"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                  <svg
                    className="w-12 h-12 mb-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-lg font-medium mb-2">
                    No transactions found
                  </p>
                  <p className="text-sm text-center">
                    Start adding transactions to see them here
                  </p>
                </div>
              )}
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

export default DashboardPage;
