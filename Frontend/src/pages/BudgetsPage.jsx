import React, { useState, useEffect } from "react";
import { usePermissions } from "../context/PermissionsContext";
import { useAIChat } from "../context/AIChatContext";
import { useAuth } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AIChatSidebar from "../components/AIChatSidebar";
import { fetchTransactions, createAuthenticatedApi } from "../services/api.js";

const BudgetsPage = () => {
  const { permissions } = usePermissions();
  const { getToken } = useAuth();
  const {
    isAIChatOpen,
    isAIChatCollapsed,
    toggleAIChat,
    toggleAIChatCollapse,
  } = useAIChat();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newBudget, setNewBudget] = useState({
    name: "",
    amount: "",
    category: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch budgets from API
  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        setLoading(true);
        setError(null);

        // Create authenticated API instance
        const authApi = createAuthenticatedApi(getToken);

        // Fetch transactions using the authenticated API
        const response = await fetchTransactions(authApi);
        const transactions = response.data;

        if (transactions && transactions.length > 0) {
          // Group transactions by category and calculate spending
          const categorySpending = {};
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();

          // Handle nested transaction structure from MongoDB
          transactions.forEach((transactionDoc) => {
            // Each document has a transactions array
            const userTransactions = transactionDoc.transactions || [];

            userTransactions.forEach((transaction) => {
              const transactionDate = new Date(transaction.date);
              if (
                transactionDate.getMonth() === currentMonth &&
                transactionDate.getFullYear() === currentYear &&
                transaction.type === "expense"
              ) {
                const category = transaction.category || "Other";
                if (!categorySpending[category]) {
                  categorySpending[category] = 0;
                }
                categorySpending[category] += Math.abs(transaction.amount);
              }
            });
          });

          // Create budget objects from spending data
          const budgetData = Object.entries(categorySpending)
            .map(([category, spent], index) => {
              // Set budget amounts based on category (you can adjust these)
              const budgetAmounts = {
                rent: 30000,
                groceries: 15000,
                utilities: 5000,
                entertainment: 8000,
                salary: 0, // Skip salary as it's income
                other: 10000,
              };

              const budgetAmount =
                budgetAmounts[category.toLowerCase()] || 10000;
              const percentage = (spent / budgetAmount) * 100;

              let status = "on-track";
              if (percentage > 100) status = "over-budget";
              else if (percentage < 70) status = "under-budget";

              return {
                id: index + 1,
                category: category.charAt(0).toUpperCase() + category.slice(1),
                budgetAmount,
                spentAmount: spent,
                period: "monthly",
                startDate: new Date(currentYear, currentMonth, 1).toISOString(),
                endDate: new Date(
                  currentYear,
                  currentMonth + 1,
                  0
                ).toISOString(),
                status,
              };
            })
            .filter((budget) => budget.category.toLowerCase() !== "salary"); // Filter out salary

          setBudgets(budgetData);
        } else {
          setBudgets([]);
        }
      } catch (err) {
        console.error("Error fetching budget data:", err);
        setError("Failed to load budget data");
        setBudgets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgets();
  }, []);

  const totalBudget = budgets.reduce(
    (sum, budget) => sum + budget.budgetAmount,
    0
  );
  const totalSpent = budgets.reduce(
    (sum, budget) => sum + budget.spentAmount,
    0
  );
  const remainingBudget = totalBudget - totalSpent;
  const budgetUtilization =
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const getProgressColor = (percentage) => {
    if (percentage <= 70) return "bg-emerald-500";
    if (percentage <= 90) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "under-budget":
        return "bg-emerald-900/50 text-emerald-300 border border-emerald-800";
      case "on-track":
        return "bg-blue-900/50 text-blue-300 border border-blue-800";
      case "over-budget":
        return "bg-red-900/50 text-red-300 border border-red-800";
      default:
        return "bg-gray-800 text-gray-400 border border-gray-700";
    }
  };

  if (loading) {
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
            title="Budgets"
            subtitle="Track and manage your spending budgets across categories."
          />
          <div className="p-8 bg-black">
            <div className="flex items-center justify-center h-64">
              <div className="text-white">Loading budget data...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
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
            title="Budgets"
            subtitle="Track and manage your spending budgets across categories."
          />
          <div className="p-8 bg-black">
            <div className="flex items-center justify-center h-64">
              <div className="text-red-400">Error: {error}</div>
            </div>
          </div>
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
          title="Budgets"
          subtitle="Track and manage your spending budgets across categories."
        />

        {/* Content */}
        <div className="p-8 bg-black">
          {budgets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">
                No Budget Data Available
              </h3>
              <p className="text-gray-400 mb-6">
                Start by making some transactions to see budget insights based
                on your spending patterns.
              </p>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 font-medium transition-colors">
                Create Your First Budget
              </button>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                    <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                      Total Budget
                    </h3>
                    <p className="text-3xl font-semibold text-white mb-2">
                      ₹{totalBudget.toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm">This month</p>
                  </div>
                  <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                    <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                      Total Spent
                    </h3>
                    <p className="text-3xl font-semibold text-white mb-2">
                      ₹{totalSpent.toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm">This month</p>
                  </div>
                  <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                    <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                      Remaining
                    </h3>
                    <p
                      className={`text-3xl font-semibold mb-2 ${
                        remainingBudget >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      ₹{Math.abs(remainingBudget).toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {remainingBudget >= 0 ? "Available" : "Over budget"}
                    </p>
                  </div>
                  <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                    <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                      Utilization
                    </h3>
                    <p className="text-3xl font-semibold text-white mb-2">
                      {budgetUtilization.toFixed(1)}%
                    </p>
                    <div className="w-full bg-gray-700 h-2 mt-2">
                      <div
                        className={`h-2 ${getProgressColor(
                          budgetUtilization
                        )} transition-all duration-300`}
                        style={{
                          width: `${Math.min(budgetUtilization, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Categories */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-medium text-white">
                    Budget Categories
                  </h2>
                  <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-medium transition-colors">
                    Create Budget
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {budgets.map((budget) => {
                    const percentage =
                      (budget.spentAmount / budget.budgetAmount) * 100;
                    const remaining = budget.budgetAmount - budget.spentAmount;

                    return (
                      <div
                        key={budget.id}
                        className="bg-gray-950 p-6 border border-gray-800 shadow-xl"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-white font-medium text-lg">
                            {budget.category}
                          </h3>
                          <span
                            className={`px-3 py-1 text-xs font-medium uppercase tracking-wide ${getStatusColor(
                              budget.status
                            )}`}
                          >
                            {budget.status.replace("-", " ")}
                          </span>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-300 text-sm">
                              Progress
                            </span>
                            <span className="text-white font-medium">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 h-3">
                            <div
                              className={`h-3 ${getProgressColor(
                                percentage
                              )} transition-all duration-300`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-gray-400 text-xs mb-1">Budget</p>
                            <p className="text-white font-semibold">
                              ₹{budget.budgetAmount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs mb-1">Spent</p>
                            <p className="text-white font-semibold">
                              ₹{budget.spentAmount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs mb-1">
                              Remaining
                            </p>
                            <p
                              className={`font-semibold ${
                                remaining >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              ₹{Math.abs(remaining).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-800">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">
                              {new Date(budget.startDate).toLocaleDateString()}{" "}
                              - {new Date(budget.endDate).toLocaleDateString()}
                            </span>
                            <button className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                              Edit Budget
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Budget Insights */}
              <div className="bg-gray-950 border border-gray-800 shadow-xl">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h3 className="text-lg font-medium text-white">
                    Budget Insights
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-emerald-400 mb-2">
                        <svg
                          className="w-8 h-8 mx-auto"
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
                      </div>
                      <h4 className="text-white font-medium mb-2">
                        Categories Tracked
                      </h4>
                      <p className="text-2xl font-semibold text-emerald-400">
                        {budgets.length}
                      </p>
                      <p className="text-gray-400 text-sm">Active budgets</p>
                    </div>
                    <div className="text-center">
                      <div className="text-red-400 mb-2">
                        <svg
                          className="w-8 h-8 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-white font-medium mb-2">
                        Over Budget
                      </h4>
                      <p className="text-2xl font-semibold text-red-400">
                        {
                          budgets.filter((b) => b.status === "over-budget")
                            .length
                        }
                      </p>
                      <p className="text-gray-400 text-sm">
                        Categories exceeded
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-emerald-400 mb-2">
                        <svg
                          className="w-8 h-8 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2l-4-4 2 2"
                          />
                        </svg>
                      </div>
                      <h4 className="text-white font-medium mb-2">On Track</h4>
                      <p className="text-2xl font-semibold text-emerald-400">
                        {
                          budgets.filter(
                            (b) =>
                              b.status === "on-track" ||
                              b.status === "under-budget"
                          ).length
                        }
                      </p>
                      <p className="text-gray-400 text-sm">
                        Categories on target
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {isAIChatOpen && (
        <AnimatePresence>
          <div className="fixed top-0 right-0 h-full z-50">
            <AIChatSidebar
              isOpen={isAIChatOpen}
              isCollapsed={isAIChatCollapsed}
              onClose={() => toggleAIChat()}
              onToggleCollapse={() => toggleAIChatCollapse()}
            />
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default BudgetsPage;
