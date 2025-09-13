import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { usePermissions } from "../context/PermissionsContext";
import { useAIChat } from "../context/AIChatContext";
import { motion, AnimatePresence } from "framer-motion";
import { createAuthenticatedApi } from "../services/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AIChatSidebar from "../components/AIChatSidebar";

const AccountsPage = () => {
  const { user, getToken } = useUser();
  const { permissions } = usePermissions();
  const {
    isAIChatOpen,
    isAIChatCollapsed,
    toggleAIChat,
    toggleAIChatCollapse,
  } = useAIChat();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!permissions.assets || !getToken) return;

      setLoading(true);
      try {
        const authApi = createAuthenticatedApi(getToken);
        const response = await authApi.get("/data/assets");

        if (response.data) {
          // Process assets data into accounts format
          const processedAccounts = [];

          response.data.forEach((doc, docIndex) => {
            // Process bank accounts
            if (doc.bank_accounts) {
              doc.bank_accounts.forEach((account, index) => {
                processedAccounts.push({
                  id: `bank_${docIndex}_${index}`,
                  name: account.bank_name || "Bank Account",
                  type: account.type || "checking",
                  balance: account.balance || 0,
                  accountNumber: `****${String(
                    account.account_number || "0000"
                  ).slice(-4)}`,
                  bank: account.bank_name || "Unknown Bank",
                  status: "active",
                  lastTransaction: new Date().toISOString().split("T")[0],
                });
              });
            }

            // Process real estate as investment accounts
            if (doc.real_estate) {
              doc.real_estate.forEach((property, index) => {
                processedAccounts.push({
                  id: `property_${docIndex}_${index}`,
                  name: `${property.type} Property`,
                  type: "investment",
                  balance: property.current_value || 0,
                  accountNumber: `****PROP`,
                  bank: "Real Estate",
                  status: "active",
                  lastTransaction: new Date().toISOString().split("T")[0],
                });
              });
            }

            // Process vehicles as assets
            if (doc.vehicles) {
              doc.vehicles.forEach((vehicle, index) => {
                processedAccounts.push({
                  id: `vehicle_${docIndex}_${index}`,
                  name: `${vehicle.type} Vehicle`,
                  type: "investment",
                  balance: vehicle.current_value || 0,
                  accountNumber: `****AUTO`,
                  bank: "Vehicle Asset",
                  status: "active",
                  lastTransaction: new Date().toISOString().split("T")[0],
                });
              });
            }
          });

          setAccounts(processedAccounts);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [permissions, getToken]);

  const totalBalance = accounts.reduce(
    (sum, account) => sum + account.balance,
    0
  );
  const activeAccounts = accounts.filter(
    (account) => account.status === "active"
  ).length;
  const creditBalance = accounts
    .filter((account) => account.type === "credit")
    .reduce((sum, account) => sum + Math.abs(account.balance), 0);

  const getAccountTypeIcon = (type) => {
    switch (type) {
      case "checking":
        return (
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
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        );
      case "savings":
        return (
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        );
      case "credit":
        return (
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
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        );
      case "investment":
        return (
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
        );
      case "fd":
        return (
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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        );
      default:
        return (
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
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const getAccountTypeColor = (type) => {
    switch (type) {
      case "checking":
        return "text-blue-400";
      case "savings":
        return "text-emerald-400";
      case "credit":
        return "text-red-400";
      case "investment":
        return "text-purple-400";
      case "fd":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="flex h-screen bg-black relative">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onAIToggle={toggleAIChat}
        isAIChatOpen={isAIChatOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          title="Accounts"
          subtitle="Manage and monitor all your financial accounts."
        />

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          {/* Summary Cards */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Total Balance
                </h3>
                <p className="text-3xl font-semibold text-white mb-2">
                  ₹{totalBalance.toLocaleString()}
                </p>
                <p className="text-emerald-400 text-sm">Across all accounts</p>
              </div>
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Active Accounts
                </h3>
                <p className="text-3xl font-semibold text-white mb-2">
                  {activeAccounts}
                </p>
                <p className="text-gray-400 text-sm">Connected accounts</p>
              </div>
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Credit Used
                </h3>
                <p className="text-3xl font-semibold text-red-400 mb-2">
                  ₹{creditBalance.toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">Outstanding balance</p>
              </div>
            </div>
          </div>

          {/* Accounts Grid */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-white">Your Accounts</h2>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-medium transition-colors">
                Add Account
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-gray-950 p-6 border border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">
                        {getAccountTypeIcon(account.type)}
                      </span>
                      <div>
                        <h3 className="text-white font-medium">
                          {account.name}
                        </h3>
                        <p className="text-gray-400 text-sm">{account.bank}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium uppercase tracking-wide ${
                        account.status === "active"
                          ? "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
                          : "bg-gray-800 text-gray-400 border border-gray-700"
                      }`}
                    >
                      {account.status}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-400 text-sm mb-1">Account Number</p>
                    <p className="text-white font-mono">
                      {account.accountNumber}
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-400 text-sm mb-1">Balance</p>
                    <p
                      className={`text-2xl font-semibold ${
                        account.balance >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {account.balance >= 0 ? "" : "-"}₹
                      {Math.abs(account.balance).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs">Last Transaction</p>
                      <p className="text-gray-300 text-sm">
                        {new Date(account.lastTransaction).toLocaleDateString()}
                      </p>
                    </div>
                    <button className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account Types Overview */}
          <div className="bg-gray-950 border border-gray-800 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="text-lg font-medium text-white">
                Account Types Overview
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {["checking", "savings", "credit", "investment", "fd"].map(
                  (type) => {
                    const typeAccounts = accounts.filter(
                      (account) => account.type === type
                    );
                    const typeBalance = typeAccounts.reduce(
                      (sum, account) => sum + account.balance,
                      0
                    );

                    return (
                      <div key={type} className="text-center">
                        <div className="text-3xl mb-2">
                          {getAccountTypeIcon(type)}
                        </div>
                        <h4 className="text-white font-medium capitalize mb-1">
                          {type}
                        </h4>
                        <p className="text-gray-400 text-sm mb-2">
                          {typeAccounts.length} accounts
                        </p>
                        <p
                          className={`font-semibold ${getAccountTypeColor(
                            type
                          )}`}
                        >
                          ₹{Math.abs(typeBalance).toLocaleString()}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
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
              onClose={toggleAIChat}
              onToggleCollapse={toggleAIChatCollapse}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AccountsPage;
