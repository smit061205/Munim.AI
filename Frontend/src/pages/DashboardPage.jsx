import React, { useState, useEffect } from "react";
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
import NetWorthChart from "../components/Charts/NetWorthChart";
import InvestmentChart from "../components/Charts/InvestmentChart";

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

  useEffect(() => {
    const fetchData = async () => {
      console.log("🚀 DashboardPage: Starting data fetch...");
      setLoading(true);

      try {
        console.log("📡 Making API calls to backend...");
        const authApi = createAuthenticatedApi(getToken);
        const allowedCategories = getAllowedCategories();

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

        console.log("📊 API Responses received:", {
          dashboard: {
            status: dashboardResponse.status,
            data:
              dashboardResponse.status === "fulfilled"
                ? dashboardResponse.value.data.data
                : null,
            error:
              dashboardResponse.status === "rejected"
                ? dashboardResponse.reason
                : null,
          },
          monthlySpending: {
            status: monthlySpendingResponse.status,
            data:
              monthlySpendingResponse.status === "fulfilled"
                ? monthlySpendingResponse.value.data.data
                : null,
            error:
              monthlySpendingResponse.status === "rejected"
                ? monthlySpendingResponse.reason
                : null,
          },
          netWorth: {
            status: netWorthResponse.status,
            data:
              netWorthResponse.status === "fulfilled"
                ? netWorthResponse.value.data.data
                : null,
            error:
              netWorthResponse.status === "rejected"
                ? netWorthResponse.reason
                : null,
          },
          spendingCategories: {
            status: spendingCategoriesResponse.status,
            data:
              spendingCategoriesResponse.status === "fulfilled"
                ? spendingCategoriesResponse.value.data.data
                : null,
            error:
              spendingCategoriesResponse.status === "rejected"
                ? spendingCategoriesResponse.reason
                : null,
          },
        });

        // Handle dashboard data
        if (dashboardResponse.status === "fulfilled") {
          console.log(
            "✅ Setting dashboard data:",
            dashboardResponse.value.data.data
          );
          setDashboardData(dashboardResponse.value.data.data);
        } else {
          console.error(
            "❌ Error fetching dashboard:",
            dashboardResponse.reason
          );
        }

        // Handle monthly spending
        if (monthlySpendingResponse.status === "fulfilled") {
          console.log(
            "✅ Setting monthly spending data:",
            monthlySpendingResponse.value.data.data
          );
          setMonthlySpending(monthlySpendingResponse.value.data.data);
        } else {
          console.error(
            "❌ Error fetching monthly spending:",
            monthlySpendingResponse.reason
          );
        }

        // Handle net worth
        if (netWorthResponse.status === "fulfilled") {
          console.log(
            "✅ Setting net worth data:",
            netWorthResponse.value.data.data
          );
          setNetWorthData(netWorthResponse.value.data.data);
        } else {
          console.error(
            "❌ Error fetching net worth:",
            netWorthResponse.reason
          );
        }

        // Handle spending categories
        if (spendingCategoriesResponse.status === "fulfilled") {
          console.log(
            "✅ Setting spending categories data:",
            spendingCategoriesResponse.value.data.data
          );
          setSpendingCategories(spendingCategoriesResponse.value.data.data);
        } else {
          console.error(
            "❌ Error fetching spending categories:",
            spendingCategoriesResponse.reason
          );
        }

        console.log("🎯 Final state after data processing:", {
          dashboardData,
          monthlySpending,
          netWorthData,
          spendingCategories,
        });
      } catch (error) {
        console.error("❌ Unexpected error in fetchData:", error);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
        console.log("✅ DashboardPage: Data fetch completed");
      }
    };

    if (getAllowedCategories().length > 0) {
      fetchData();
    }
  }, [permissions]);

  // Calculate totals from backend data
  const calculateTotals = () => {
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
      netWorth:
        dashboardData.netWorth?.metadata?.currentNetWorth ||
        dashboardData.totalAssets - dashboardData.totalLiabilities ||
        0,
      monthlyIncome: dashboardData.monthlyIncome || 0,
      monthlyExpenses: dashboardData.monthlyExpenses || 0,
    };
  };

  const {
    totalAssets,
    totalLiabilities,
    totalInvestments,
    netWorth,
    monthlyIncome,
    monthlyExpenses,
  } = calculateTotals();

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
                  Income
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
                    <button className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium">
                      1M
                    </button>
                    <button className="px-4 py-2 bg-gray-800 text-gray-300 text-sm font-medium hover:bg-gray-700">
                      3M
                    </button>
                    <button className="px-4 py-2 bg-gray-800 text-gray-300 text-sm font-medium hover:bg-gray-700">
                      1Y
                    </button>
                  </div>
                </div>
                <p className="text-2xl font-medium text-white mb-4">
                  ₹{monthlyExpenses.toLocaleString()}
                </p>
                {monthlySpending && <ExpenseChart data={monthlySpending} />}
              </div>

              {/* Spending by Category */}
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-lg font-medium text-white mb-4">
                  Spending by Category
                </h3>
                <div className="flex items-center justify-center mb-4">
                  {spendingCategories && (
                    <InvestmentChart data={spendingCategories} />
                  )}
                </div>
                <div className="space-y-3">
                  {spendingCategories?.categories?.map((category, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-3 h-3"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="text-gray-300 text-sm font-medium">
                          {category.name}
                        </span>
                      </div>
                      <span className="text-gray-400 text-sm">
                        ₹{category.amount?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <h2 className="text-xl font-medium text-white mb-6">
              Recent Transactions
            </h2>
            <div className="bg-gray-950 border border-gray-800 overflow-hidden shadow-xl">
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
                    {recentTransactions.length > 0 ? (
                      recentTransactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="hover:bg-gray-800 transition-colors"
                        >
                          <td className="px-6 py-4 text-white font-medium">
                            {transaction.description || transaction.account}
                          </td>
                          <td className="px-6 py-4 text-white font-semibold">
                            ₹
                            {Math.abs(
                              transaction.amount || transaction.balance
                            ).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 text-xs font-medium uppercase tracking-wide ${
                                transaction.type === "income" ||
                                transaction.type === "Checking"
                                  ? "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                                  : transaction.type === "expense" ||
                                    transaction.type === "Credit"
                                  ? "bg-red-900/50 text-red-300 border border-red-800"
                                  : "bg-blue-900/50 text-blue-300 border border-blue-800"
                              }`}
                            >
                              {transaction.category || transaction.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-400 font-normal">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="4"
                          className="px-6 py-8 text-center text-gray-400"
                        >
                          No recent transactions available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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

export default DashboardPage;
