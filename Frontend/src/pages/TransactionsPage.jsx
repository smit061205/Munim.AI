import React, { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { usePermissions } from "../context/PermissionsContext";
import { useAIChat } from "../context/AIChatContext";
import { motion, AnimatePresence } from "framer-motion";
import { createAuthenticatedApi } from "../services/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AIChatSidebar from "../components/AIChatSidebar";

const TransactionsPage = () => {
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    type: "all",
    dateRange: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    type: "expense",
    category: "",
    description: "",
    account: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  const handleAIToggle = () => {
    toggleAIChat();
  };

  const handleAICollapseToggle = () => {
    toggleAIChatCollapse();
  };

  const handleAddTransaction = () => {
    setShowCreateModal(true);
    setCreateError(null);
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      if (!isLoaded || !isSignedIn) {
        setCreateError("Please sign in to create transactions");
        return;
      }

      const token = await getToken();
      if (!token) {
        setCreateError("Unable to get authentication token");
        return;
      }

      const api = createAuthenticatedApi(() => Promise.resolve(token));

      const transactionData = {
        date: newTransaction.date,
        amount: parseFloat(newTransaction.amount),
        type: newTransaction.type,
        category: newTransaction.category,
        description: newTransaction.description,
        account: newTransaction.account,
      };

      const response = await api.post("/transaction", transactionData);

      if (response.data.success) {
        setTransactions((prev) => [...prev, response.data.data]);
        setShowCreateModal(false);
        setNewTransaction({
          date: new Date().toISOString().split("T")[0],
          amount: "",
          type: "expense",
          category: "",
          description: "",
          account: "",
        });
        alert("Transaction created successfully!");
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      setCreateError(
        error.response?.data?.message || "Failed to create transaction",
      );
    } finally {
      setCreateLoading(false);
    }
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      console.log("🔍 TransactionsPage: Starting fetchTransactions");
      console.log("🔍 Clerk isLoaded:", isLoaded);
      console.log("🔍 Clerk isSignedIn:", isSignedIn);
      console.log("🔍 Permissions:", permissions);

      if (!isLoaded || !isSignedIn) {
        console.log(
          "❌ Missing requirements: Clerk not loaded or user not signed in",
        );
        return;
      }

      if (!permissions?.transactions) {
        console.log("❌ No transaction permissions");
        return;
      }

      try {
        setLoading(true);
        console.log("🌐 Creating authenticated API...");
        const token = await getToken();
        if (!token) {
          console.log("❌ Unable to get authentication token");
          return;
        }

        const authApi = createAuthenticatedApi(() => Promise.resolve(token));
        console.log("📡 Making API request to /data/transactions");
        const response = await authApi.get("/data/transactions");

        console.log("📊 Raw API response:", response);
        console.log("📊 Response data:", response.data);
        console.log("📊 Response status:", response.status);

        if (response.data && response.data.status === "success") {
          // Parse the backend response structure correctly
          const transactionsData = response.data.data;
          console.log("Raw transactions response:", transactionsData);

          // The backend returns a document with a transactions array property
          const allTransactions = transactionsData?.transactions || [];

          console.log("Processed transactions:", allTransactions);
          console.log("Number of transactions:", allTransactions.length);
          setTransactions(allTransactions);
        } else {
          console.log("❌ Unexpected response structure:", response.data);
          setTransactions([]);
        }
      } catch (error) {
        console.error("❌ Error fetching transactions:", error);
        console.error("❌ Error details:", {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
        setTransactions([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [permissions, isLoaded, isSignedIn]);

  const filteredTransactions = transactions.filter((transaction) => {
    if (!transaction) return false;

    const description =
      transaction.description ||
      transaction.category ||
      `${transaction.type} transaction`;
    const category = transaction.category || "";

    const matchesSearch =
      description.toLowerCase().includes(filters.search.toLowerCase()) ||
      category.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCategory =
      filters.category === "all" || transaction.category === filters.category;
    const matchesType =
      filters.type === "all" || transaction.type === filters.type;

    // Date filtering
    let matchesDate = true;
    if (filters.dateRange !== "all" && transaction.date) {
      const transactionDate = new Date(transaction.date);
      const today = new Date();

      switch (filters.dateRange) {
        case "today":
          matchesDate = transactionDate.toDateString() === today.toDateString();
          break;
        case "week":
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = transactionDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            today.getDate(),
          );
          matchesDate = transactionDate >= monthAgo;
          break;
        case "year":
          const yearAgo = new Date(
            today.getFullYear() - 1,
            today.getMonth(),
            today.getDate(),
          );
          matchesDate = transactionDate >= yearAgo;
          break;
        default:
          matchesDate = true;
      }
    }

    return matchesSearch && matchesCategory && matchesType && matchesDate;
  });

  // Get unique categories from transactions for dynamic filtering
  const availableCategories = [
    ...new Set(transactions.map((t) => t.category).filter(Boolean)),
  ];

  const totalIncome = transactions
    .filter((t) => t && t.type === "income")
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = transactions
    .filter((t) => t && t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
  const netAmount = totalIncome - totalExpenses;

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
          title="Transactions"
          subtitle="View and manage all your financial transactions."
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {/* Summary Cards */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-white">
                Transaction Summary
              </h2>
              {/* <button
                onClick={handleAddTransaction}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-medium transition-colors"
              >
                Add Transaction
              </button> */}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Total Income
                </h3>
                <p className="text-3xl font-semibold text-emerald-400 mb-2">
                  ₹{totalIncome.toLocaleString()}
                </p>
                {/* <p className="text-gray-400 text-sm">This month</p> */}
              </div>
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Total Expenses
                </h3>
                <p className="text-3xl font-semibold text-red-400 mb-2">
                  ₹{totalExpenses.toLocaleString()}
                </p>
                {/* <p className="text-gray-400 text-sm">This month</p> */}
              </div>
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Net Amount
                </h3>
                <p
                  className={`text-3xl font-semibold mb-2 ${
                    netAmount >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  ₹{netAmount.toLocaleString()}
                </p>
                {/* <p className="text-gray-400 text-sm">This month</p> */}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="bg-gray-950 p-6 border border-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-black border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) =>
                      setFilters({ ...filters, category: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-black border border-gray-700 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: "right 0.75rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1.5em 1.5em",
                      paddingRight: "2.5rem",
                    }}
                  >
                    <option value="all">All Categories</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) =>
                      setFilters({ ...filters, type: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-black border border-gray-700 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: "right 0.75rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1.5em 1.5em",
                      paddingRight: "2.5rem",
                    }}
                  >
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) =>
                      setFilters({ ...filters, dateRange: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-black border border-gray-700 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: "right 0.75rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1.5em 1.5em",
                      paddingRight: "2.5rem",
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-gray-950 border border-gray-800 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-medium text-white">
                Recent Transactions ({filteredTransactions.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-gray-300 font-medium uppercase tracking-wide text-sm">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-gray-300 font-medium uppercase tracking-wide text-sm">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-gray-300 font-medium uppercase tracking-wide text-sm">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-gray-300 font-medium uppercase tracking-wide text-sm">
                      Account
                    </th>
                    <th className="px-6 py-4 text-right text-gray-300 font-medium uppercase tracking-wide text-sm">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-gray-300 font-medium uppercase tracking-wide text-sm">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-8 text-center text-gray-400"
                      >
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mr-3"></div>
                          Loading transactions...
                        </div>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-8 text-center text-gray-400"
                      >
                        {transactions.length === 0
                          ? "No transactions found."
                          : "No transactions match your filters."}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-6 py-4 text-gray-300 font-medium">
                          {transaction.date
                            ? new Date(transaction.date).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-white font-medium">
                          {transaction.description ||
                            transaction.category ||
                            `${transaction.type} transaction`}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {transaction.category || "Uncategorized"}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {transaction.account || "Default Account"}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-semibold ${
                            (transaction.amount || 0) >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {(transaction.amount || 0) >= 0 ? "+" : ""}₹
                          {Math.abs(transaction.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 text-xs font-medium uppercase tracking-wide ${
                              (transaction.status || "completed") ===
                              "completed"
                                ? "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                                : "bg-yellow-900/50 text-yellow-300 border border-yellow-800"
                            }`}
                          >
                            {transaction.status || "completed"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed top-0 right-0 h-full z-50">
        <AnimatePresence>
          {isAIChatOpen && (
            <AIChatSidebar
              isOpen={isAIChatOpen}
              isCollapsed={isAIChatCollapsed}
              onClose={handleAIToggle}
              onToggleCollapse={handleAICollapseToggle}
            />
          )}
        </AnimatePresence>
      </div>

      {showCreateModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center">
          <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl w-1/2">
            <h2 className="text-lg font-medium text-white mb-4">
              Create Transaction
            </h2>
            <form onSubmit={handleCreateTransaction}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      date: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-black border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      amount: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-black border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={newTransaction.type}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      type: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-black border border-gray-700 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: "right 0.75rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1.5em 1.5em",
                    paddingRight: "2.5rem",
                  }}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={newTransaction.category}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      category: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-black border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newTransaction.description}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-black border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account
                </label>
                <input
                  type="text"
                  value={newTransaction.account}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      account: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-black border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-medium transition-colors"
              >
                {createLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mr-3"></div>
                    Creating transaction...
                  </div>
                ) : (
                  "Create Transaction"
                )}
              </button>
              {createError && (
                <p className="text-red-400 mt-2">{createError}</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
