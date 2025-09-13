import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { usePermissions } from "../context/PermissionsContext";
import { useAIChat } from "../context/AIChatContext";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AIChatSidebar from "../components/AIChatSidebar";

const PermissionsPage = () => {
  const { user } = useUser();
  const { permissions, togglePermission } = usePermissions();
  const {
    isAIChatOpen,
    isAIChatCollapsed,
    toggleAIChat,
    toggleAIChatCollapse,
  } = useAIChat();
  const [loading, setLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const permissionCategories = [
    {
      key: "assets",
      label: "Assets",
      description: "Allow access to your assets data.",
      icon: (
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
      ),
    },
    {
      key: "liabilities",
      label: "Liabilities",
      description: "Allow access to your liabilities data.",
      icon: (
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
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
    {
      key: "transactions",
      label: "Transactions",
      description: "Allow access to transaction data.",
      icon: (
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      key: "investments",
      label: "Investments",
      description: "Allow access to investment data.",
      icon: (
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
      ),
    },
    {
      key: "epf",
      label: "EPF",
      description: "Allow access to EPF data.",
      icon: (
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
      ),
    },
    {
      key: "creditScore",
      label: "Credit Score",
      description: "Allow access to credit score data.",
      icon: (
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
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  const quickActions = [
    { label: "Budget", action: "Create", color: "emerald" },
    { label: "Invest", action: "Start", color: "emerald" },
    { label: "Reports", action: "View", color: "emerald" },
  ];

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
          title="Permissions"
          subtitle="Manage data access for Munim AI's features"
        />

        {/* Content */}
        <div className="p-8 bg-black">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* AI Assistant Status */}
            <div className="bg-gray-950 p-6 border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    AI Assistant Status
                  </h2>
                  <p className="text-gray-400">
                    Munimji requires permissions to access your financial data
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="bg-emerald-600 p-3 border border-gray-700">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium">Munimji</p>
                    <p className="text-emerald-400 text-sm">Online</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Categories */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                Data Categories
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {permissionCategories.map(
                  ({ key, label, description, icon }) => (
                    <div
                      key={key}
                      className="bg-gray-950 p-6 border border-gray-800 hover:border-gray-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            {icon}
                            <h3 className="text-lg font-semibold text-white">
                              {label}
                            </h3>
                          </div>
                          <p className="text-gray-400 text-sm leading-relaxed">
                            {description}
                          </p>
                        </div>
                        <button
                          onClick={() => togglePermission(key)}
                          className={`relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none ml-6 ${
                            permissions[key] ? "bg-emerald-600" : "bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform bg-white transition-transform ${
                              permissions[key]
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {quickActions.map(({ label, action, color }) => (
                  <div
                    key={label}
                    className="bg-gray-950 p-6 border border-gray-800 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {label}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {action === "Create" && "Set up a new budget plan"}
                          {action === "Start" &&
                            "Begin your investment journey"}
                          {action === "View" && "Generate financial reports"}
                        </p>
                      </div>
                      <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 transition-colors font-medium text-sm">
                        {action}
                      </button>
                    </div>
                  </div>
                ))}
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

export default PermissionsPage;
