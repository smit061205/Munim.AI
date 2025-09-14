import React, { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { usePermissions } from "../context/PermissionsContext";
import { useAIChat } from "../context/AIChatContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  createAuthenticatedApi,
  fetchBudgets,
  createBudget,
} from "../services/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AIChatSidebar from "../components/AIChatSidebar";
import Modal from "../components/Modal";

const BudgetsPage = () => {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { permissions } = usePermissions();
  const {
    isAIChatOpen,
    isAIChatCollapsed,
    toggleAIChat,
    toggleAIChatCollapse,
  } = useAIChat();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBudget, setNewBudget] = useState({
    category: "",
    budgetAmount: "",
    period: "monthly",
    startDate: "",
    endDate: "",
  });
  const [error, setError] = useState(null);

  const handleAIToggle = () => {
    toggleAIChat();
  };

  const handleAICollapseToggle = () => {
    toggleAIChatCollapse();
  };

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    if (!isLoaded || !isSignedIn) return;

    try {
      const token = await getToken();
      const authApi = createAuthenticatedApi(() => Promise.resolve(token));
      const response = await createBudget(authApi, newBudget);
      if (response.data.success) {
        setBudgets([...budgets, response.data.data]);
        setShowCreateModal(false);
        setNewBudget({
          category: "",
          budgetAmount: "",
          period: "monthly",
          startDate: "",
          endDate: "",
        });
        setError(null);
      } else {
        setError("Failed to create budget");
      }
    } catch (err) {
      console.error("Create budget error:", err);
      setError("Failed to create budget");
    }
  };

  useEffect(() => {
    const fetchBudgetData = async () => {
      console.log("BudgetsPage: useEffect triggered", { isLoaded, isSignedIn });

      if (!isLoaded) {
        console.log("BudgetsPage: Not loaded yet");
        return;
      }

      if (!isSignedIn) {
        console.log("BudgetsPage: Not signed in");
        setError("Please sign in to view budgets");
        return;
      }

      setLoading(true);
      try {
        console.log("BudgetsPage: Fetching budget data...");
        const token = await getToken();
        console.log("BudgetsPage: Got token:", token ? "✓" : "✗");

        const authApi = createAuthenticatedApi(() => Promise.resolve(token));
        const response = await fetchBudgets(authApi);

        console.log("Budget response:", response);

        if (response.data.success) {
          setBudgets(response.data.data || []);
          setError(null);
          console.log(
            "BudgetsPage: Successfully set budgets:",
            response.data.data
          );
        } else {
          setError("Failed to load budget data");
          console.log("BudgetsPage: API returned unsuccessful response");
        }
      } catch (err) {
        console.error("Fetch budgets error:", err);
        setError(`Failed to load budget data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetData();
  }, [isLoaded, isSignedIn, getToken]);

  // Add early return for authentication states
  if (!isLoaded) {
    return (
      <div className="flex h-screen bg-black relative">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex h-screen bg-black relative">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white">Please sign in to view budgets</div>
        </div>
      </div>
    );
  }

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
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 font-medium transition-colors"
              >
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
                      ₹
                      {budgets
                        .reduce((sum, budget) => sum + budget.budgetAmount, 0)
                        .toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm">This month</p>
                  </div>
                  <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                    <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                      Total Spent
                    </h3>
                    <p className="text-3xl font-semibold text-white mb-2">
                      ₹
                      {budgets
                        .reduce((sum, budget) => sum + budget.spentAmount, 0)
                        .toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm">This month</p>
                  </div>
                  <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                    <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                      Remaining
                    </h3>
                    <p
                      className={`text-3xl font-semibold mb-2 ${
                        budgets.reduce(
                          (sum, budget) => sum + budget.budgetAmount,
                          0
                        ) -
                          budgets.reduce(
                            (sum, budget) => sum + budget.spentAmount,
                            0
                          ) >=
                        0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      ₹
                      {Math.abs(
                        budgets.reduce(
                          (sum, budget) => sum + budget.budgetAmount,
                          0
                        ) -
                          budgets.reduce(
                            (sum, budget) => sum + budget.spentAmount,
                            0
                          )
                      ).toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {budgets.reduce(
                        (sum, budget) => sum + budget.budgetAmount,
                        0
                      ) -
                        budgets.reduce(
                          (sum, budget) => sum + budget.spentAmount,
                          0
                        ) >=
                      0
                        ? "Available"
                        : "Over budget"}
                    </p>
                  </div>
                  <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                    <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                      Utilization
                    </h3>
                    <p className="text-3xl font-semibold text-white mb-2">
                      {(
                        (budgets.reduce(
                          (sum, budget) => sum + budget.spentAmount,
                          0
                        ) /
                          budgets.reduce(
                            (sum, budget) => sum + budget.budgetAmount,
                            0
                          )) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                    <div className="w-full bg-gray-700 h-2 mt-2">
                      <div
                        className={`h-2 ${
                          (budgets.reduce(
                            (sum, budget) => sum + budget.spentAmount,
                            0
                          ) /
                            budgets.reduce(
                              (sum, budget) => sum + budget.budgetAmount,
                              0
                            )) *
                            100 <=
                          70
                            ? "bg-emerald-500"
                            : (budgets.reduce(
                                (sum, budget) => sum + budget.spentAmount,
                                0
                              ) /
                                budgets.reduce(
                                  (sum, budget) => sum + budget.budgetAmount,
                                  0
                                )) *
                                100 <=
                              90
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        } transition-all duration-300`}
                        style={{
                          width: `${
                            (budgets.reduce(
                              (sum, budget) => sum + budget.spentAmount,
                              0
                            ) /
                              budgets.reduce(
                                (sum, budget) => sum + budget.budgetAmount,
                                0
                              )) *
                            100
                          }%`,
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
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-medium transition-colors"
                  >
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
                            className={`px-3 py-1 text-xs font-medium uppercase tracking-wide ${
                              budget.status === "on-track" ||
                              budget.status === "under-budget"
                                ? "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                                : budget.status === "over-budget"
                                ? "bg-red-900/50 text-red-300 border border-red-800"
                                : "bg-gray-800 text-gray-400 border border-gray-700"
                            }`}
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
                              className={`h-3 ${
                                percentage <= 70
                                  ? "bg-emerald-500"
                                  : percentage <= 90
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              } transition-all duration-300`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-gray-400 text-xs mb-1">Budget</p>
                            <p className="text-white font-semibold">
                              ₹{budget.budgetAmount?.toLocaleString() || "0"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs mb-1">Spent</p>
                            <p className="text-white font-semibold">
                              ₹{budget.spentAmount?.toLocaleString() || "0"}
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

      {showCreateModal && (
        <Modal title="Create Budget" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreateBudget}>
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800 text-red-300 rounded">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Category *
              </label>
              <input
                type="text"
                id="category"
                required
                placeholder="e.g., Food, Transportation, Entertainment"
                value={newBudget.category}
                onChange={(e) =>
                  setNewBudget({ ...newBudget, category: e.target.value })
                }
                className="block w-full px-3 py-2 text-sm text-white bg-gray-800 border border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="budgetAmount"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Budget Amount (₹) *
              </label>
              <input
                type="number"
                id="budgetAmount"
                required
                min="1"
                placeholder="10000"
                value={newBudget.budgetAmount}
                onChange={(e) =>
                  setNewBudget({ ...newBudget, budgetAmount: e.target.value })
                }
                className="block w-full px-3 py-2 text-sm text-white bg-gray-800 border border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="period"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Period
              </label>
              <select
                id="period"
                value={newBudget.period}
                onChange={(e) =>
                  setNewBudget({ ...newBudget, period: e.target.value })
                }
                className="block w-full px-3 py-2 text-sm text-white bg-gray-800 border border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  required
                  value={newBudget.startDate}
                  onChange={(e) =>
                    setNewBudget({ ...newBudget, startDate: e.target.value })
                  }
                  className="block w-full px-3 py-2 text-sm text-white bg-gray-800 border border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  required
                  value={newBudget.endDate}
                  onChange={(e) =>
                    setNewBudget({ ...newBudget, endDate: e.target.value })
                  }
                  className="block w-full px-3 py-2 text-sm text-white bg-gray-800 border border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {loading ? "Creating..." : "Create Budget"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default BudgetsPage;
