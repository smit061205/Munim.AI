import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { usePermissions } from "../context/PermissionsContext";
import { useAIChat } from "../context/AIChatContext";
import { motion, AnimatePresence } from "framer-motion";
import { createAuthenticatedApi } from "../services/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AIChatSidebar from "../components/AIChatSidebar";

const TransactionsPage = () => {
  const { user, getToken } = useUser();
  const { permissions } = usePermissions();
  const {
    isAIChatOpen,
    isAIChatCollapsed,
    toggleAIChat,
    toggleAIChatCollapse,
  } = useAIChat();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  const handleAIToggle = () => {
    toggleAIChat();
  };

  const handleAICollapseToggle = () => {
    toggleAIChatCollapse();
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!permissions.transactions || !getToken) return;

      setLoading(true);
      try {
        const authApi = createAuthenticatedApi(getToken);
        const response = await authApi.get("/data/transactions");

        if (response.data) {
          // Flatten transactions from the nested structure
          const allTransactions = response.data.flatMap(
            (doc) => doc.transactions || []
          );
          setTransactions(allTransactions);
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [permissions, getToken]);

  const filteredTransactions = transactions.filter((transaction) => {
    if (!transaction) return false;

    const description = transaction.description || "";
    const category = transaction.category || "";

    const matchesSearch =
      description.toLowerCase().includes(filters.search.toLowerCase()) ||
      category.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCategory =
      filters.category === "all" || transaction.category === filters.category;
    const matchesType =
      filters.type === "all" || transaction.type === filters.type;

    return matchesSearch && matchesCategory && matchesType;
  });

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const netAmount = totalIncome - totalExpenses;

  return (
    <div className="flex h-screen bg-black relative">
      <Sidebar
        onAIToggle={handleAIToggle}
        isAIChatOpen={isAIChatOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <div className="flex-1 overflow-auto bg-black">
        <Navbar
          title="Transactions"
          subtitle="View and manage all your financial transactions."
        />

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          {/* Summary Cards */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Total Income
                </h3>
                <p className="text-3xl font-semibold text-emerald-400 mb-2">
                  ₹{totalIncome.toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">This month</p>
              </div>
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Total Expenses
                </h3>
                <p className="text-3xl font-semibold text-red-400 mb-2">
                  ₹{totalExpenses.toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">This month</p>
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
                <p className="text-gray-400 text-sm">This month</p>
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
                    <option value="Food & Dining">Food & Dining</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Income">Income</option>
                    <option value="Investment">Investment</option>
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
                  {filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-300 font-medium">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        {transaction.description || ""}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {transaction.category || ""}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {transaction.account || ""}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-semibold ${
                          transaction.amount >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {transaction.amount >= 0 ? "+" : ""}₹
                        {Math.abs(transaction.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs font-medium uppercase tracking-wide ${
                            transaction.status === "completed"
                              ? "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                              : "bg-yellow-900/50 text-yellow-300 border border-yellow-800"
                          }`}
                        >
                          {transaction.status || ""}
                        </span>
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
};

export default TransactionsPage;
