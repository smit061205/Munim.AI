import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { usePermissions } from "../context/PermissionsContext";
import { useAIChat } from "../context/AIChatContext";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AIChatSidebar from "../components/AIChatSidebar";

const SettingsPage = () => {
  const { user } = useUser();
  const { permissions } = usePermissions();
  const {
    isAIChatOpen,
    isAIChatCollapsed,
    toggleAIChat,
    toggleAIChatCollapse,
  } = useAIChat();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      budgetAlerts: true,
      investmentUpdates: true,
    },
    privacy: {
      dataSharing: false,
      analytics: true,
      marketing: false,
    },
    display: {
      theme: "dark",
      currency: "INR",
      dateFormat: "DD/MM/YYYY",
    },
  });

  const handleNotificationChange = (key) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  const handlePrivacyChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value,
      },
    }));
  };

  const handleDisplayChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      display: {
        ...prev.display,
        [key]: value,
      },
    }));
  };

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
          title="Settings"
          subtitle="Manage your account preferences and application settings."
        />

        {/* Content */}
        <div className="p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Account Information */}
            <div className="bg-gray-950 p-6 border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-6">
                Account Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-black border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-black border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 bg-black border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-black border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    placeholder="Enter your company name"
                  />
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-gray-950 p-6 border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-6">
                Notification Preferences
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">
                      Email Notifications
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Receive updates via email
                    </p>
                  </div>
                  <button
                    onClick={() => handleNotificationChange("email")}
                    className={`relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none ${
                      settings.notifications.email
                        ? "bg-emerald-600"
                        : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform bg-white transition ${
                        settings.notifications.email
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">
                      Push Notifications
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Receive push notifications in browser
                    </p>
                  </div>
                  <button
                    onClick={() => handleNotificationChange("push")}
                    className={`relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none ${
                      settings.notifications.push
                        ? "bg-emerald-600"
                        : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform bg-white transition ${
                        settings.notifications.push
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Budget Alerts</h3>
                    <p className="text-gray-400 text-sm">
                      Receive budget alerts via email
                    </p>
                  </div>
                  <button
                    onClick={() => handleNotificationChange("budgetAlerts")}
                    className={`relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none ${
                      settings.notifications.budgetAlerts
                        ? "bg-emerald-600"
                        : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform bg-white transition ${
                        settings.notifications.budgetAlerts
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">
                      Investment Updates
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Receive investment updates via email
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleNotificationChange("investmentUpdates")
                    }
                    className={`relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none ${
                      settings.notifications.investmentUpdates
                        ? "bg-emerald-600"
                        : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform bg-white transition ${
                        settings.notifications.investmentUpdates
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-gray-950 p-6 border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-6">
                Privacy & Security
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Data Sharing
                  </label>
                  <p className="text-gray-400 text-sm">
                    Allow sharing of anonymized data for analytics
                  </p>
                  <button
                    onClick={() =>
                      handlePrivacyChange(
                        "dataSharing",
                        !settings.privacy.dataSharing
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none ${
                      settings.privacy.dataSharing
                        ? "bg-emerald-600"
                        : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform bg-white transition ${
                        settings.privacy.dataSharing
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Analytics
                  </label>
                  <p className="text-gray-400 text-sm">
                    Help improve our service by sharing usage data
                  </p>
                  <button
                    onClick={() =>
                      handlePrivacyChange(
                        "analytics",
                        !settings.privacy.analytics
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none ${
                      settings.privacy.analytics
                        ? "bg-emerald-600"
                        : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform bg-white transition ${
                        settings.privacy.analytics
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Marketing Communications
                  </label>
                  <p className="text-gray-400 text-sm">
                    Receive product updates and offers
                  </p>
                  <button
                    onClick={() =>
                      handlePrivacyChange(
                        "marketing",
                        !settings.privacy.marketing
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none ${
                      settings.privacy.marketing
                        ? "bg-emerald-600"
                        : "bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform bg-white transition ${
                        settings.privacy.marketing
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Display Settings */}
            <div className="bg-gray-950 p-6 border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-6">
                Display Preferences
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Theme
                  </label>
                  <select
                    value={settings.display.theme}
                    onChange={(e) =>
                      handleDisplayChange("theme", e.target.value)
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
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Currency
                  </label>
                  <select
                    value={settings.display.currency}
                    onChange={(e) =>
                      handleDisplayChange("currency", e.target.value)
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
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date Format
                  </label>
                  <select
                    value={settings.display.dateFormat}
                    onChange={(e) =>
                      handleDisplayChange("dateFormat", e.target.value)
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
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <button className="px-6 py-3 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button className="px-6 py-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {isAIChatOpen && (
        <AnimatePresence>
          <div className="fixed top-0 right-0 h-full z-50">
            <AIChatSidebar
              isOpen={isAIChatOpen}
              isCollapsed={isAIChatCollapsed}
              onClose={toggleAIChat}
              onToggleCollapse={toggleAIChatCollapse}
            />
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default SettingsPage;
