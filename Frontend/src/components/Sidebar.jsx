import React, { useState, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserButton, UserProfile } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";

const Sidebar = ({ onAIToggle, isAIChatOpen, isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const [showProfile, setShowProfile] = useState(false);

  // Memoized animation variants for better performance
  const sidebarVariants = useMemo(
    () => ({
      expanded: {
        width: 256, // w-64 = 256px
        transition: {
          duration: 0.3,
          ease: [0.32, 0.72, 0, 1],
          width: {
            duration: 0.25,
            ease: [0.4, 0.0, 0.2, 1],
          },
        },
      },
      collapsed: {
        width: 100, // w-16 = 64px
        transition: {
          duration: 0.3,
          ease: [0.32, 0.72, 0, 1],
          width: {
            duration: 0.25,
            ease: [0.4, 0.0, 0.2, 1],
          },
        },
      },
    }),
    []
  );

  const itemVariants = useMemo(
    () => ({
      hover: {
        scale: 1.02,
        backgroundColor: "rgb(17, 24, 39)", // gray-900
        transition: { duration: 0.2, ease: "easeOut" },
      },
      tap: {
        scale: 0.98,
        transition: { duration: 0.1 },
      },
      rest: {
        scale: 1,
        backgroundColor: "rgba(0, 0, 0, 0)",
        transition: { duration: 0.2, ease: "easeOut" },
      },
    }),
    []
  );

  const activeItemVariants = useMemo(
    () => ({
      active: {
        backgroundColor: "rgb(5, 150, 105)", // emerald-600
        scale: 1.02,
        boxShadow:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
      inactive: {
        backgroundColor: "rgba(0, 0, 0, 0)",
        scale: 1,
        boxShadow: "none",
      },
    }),
    []
  );

  // Optimized toggle function
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed, setIsCollapsed]);

  const navigationItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
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
      isActive: location.pathname === "/dashboard",
    },
    {
      name: "Transactions",
      path: "/transactions",
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
      isActive: location.pathname === "/transactions",
    },
    {
      name: "Accounts",
      path: "/accounts",
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
      isActive: location.pathname === "/accounts",
    },
    {
      name: "Budgets",
      path: "/budgets",
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
      isActive: location.pathname === "/budgets",
    },
    {
      name: "Investments",
      path: "/investments",
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
      isActive: location.pathname === "/investments",
    },
    {
      name: "Reports",
      path: "/reports",
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      isActive: location.pathname === "/reports",
    },
  ];

  const bottomItems = [
    // {
    // name: "Permissions",
    // path: "/permissions",
    // icon: (
    //   <svg
    //     className="w-5 h-5"
    //     fill="none"
    //     stroke="currentColor"
    //     viewBox="0 0 24 24"
    //   >
    //     <path
    //       strokeLinecap="round"
    //       strokeLinejoin="round"
    //         strokeWidth={2}
    //         d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    //       />
    //       <path
    //         strokeLinecap="round"
    //         strokeLinejoin="round"
    //         strokeWidth={2}
    //         d="M15 12a9 9 0 11-18 0 9 9 0 0118 0z"
    //       />
    //     </svg>
    //   ),
    //   isActive: location.pathname === "/permissions",
    // },
    {
      name: "Settings",
      path: "/settings",
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
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      ),
      isActive: location.pathname === "/settings",
    },
  ];

  return (
    <div className="relative">
      <motion.div
        initial={false}
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        className={`bg-black h-screen flex flex-col border-r border-gray-800 transition-all duration-300 overflow-hidden`}
        style={{
          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
        }}
      >
        {/* Logo */}
        <div className="p-[14px] border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-center">
            <img
              src="/Gemini_Generated_Image_ko4f0gko4f0gko4f.png"
              alt="Munim.AI Logo"
              className="w-15 h-15 rounded-lg"
            />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  className="text-white font-medium text-xl ml-3"
                >
                  Munim.AI
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-6 flex-1 overflow-y-auto">
          <div className="space-y-2">
            {navigationItems.map((item) => (
              <Link key={item.name} to={item.path} className="block">
                <motion.div
                  initial={false}
                  whileHover="hover"
                  whileTap="tap"
                  variants={item.isActive ? activeItemVariants : itemVariants}
                  animate={item.isActive ? "active" : "rest"}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer ${
                    item.isActive
                      ? "text-white"
                      : "text-gray-300 hover:text-white"
                  } ${isCollapsed ? "justify-center" : ""}`}
                  title={isCollapsed ? item.name : ""}
                  style={{
                    transform: "translate3d(0, 0, 0)",
                    backfaceVisibility: "hidden",
                  }}
                >
                  {item.icon}
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                        className="font-medium"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            ))}
          </div>
        </nav>

        {/* AI Chat Toggle */}
        <div className="px-4 py-4 border-t border-gray-800 flex-shrink-0">
          <motion.button
            initial={false}
            whileHover="hover"
            whileTap="tap"
            variants={itemVariants}
            onClick={onAIToggle}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
              isAIChatOpen
                ? "bg-emerald-600 text-white shadow-lg"
                : "text-gray-300 hover:bg-gray-900 hover:text-white bg-gray-900"
            } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Ask Munimji" : ""}
            style={{
              transform: "translate3d(0, 0, 0)",
              backfaceVisibility: "hidden",
            }}
          >
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="font-medium"
                >
                  Ask Munimji
                </motion.span>
              )}
            </AnimatePresence>
            {isAIChatOpen && !isCollapsed && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto"
              >
                <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></div>
              </motion.div>
            )}
          </motion.button>
        </div>

        {/* Bottom Navigation */}
        <div className="px-4 py-4 border-t border-gray-800 flex-shrink-0">
          <div className="space-y-2 mb-4">
            {bottomItems.map((item) => (
              <Link key={item.name} to={item.path} className="block">
                <motion.div
                  initial={false}
                  whileHover="hover"
                  whileTap="tap"
                  variants={item.isActive ? activeItemVariants : itemVariants}
                  animate={item.isActive ? "active" : "rest"}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer ${
                    item.isActive
                      ? "text-white"
                      : "text-gray-300 hover:text-white"
                  } ${isCollapsed ? "justify-center" : ""}`}
                  title={isCollapsed ? item.name : ""}
                  style={{
                    transform: "translate3d(0, 0, 0)",
                    backfaceVisibility: "hidden",
                  }}
                >
                  {item.icon}
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                        className="font-medium"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            ))}
          </div>

          {/* User Profile */}
          <div
            className={`flex items-center space-x-3 px-4 py-3 bg-gray-900 rounded-lg ${
              isCollapsed ? "justify-center" : ""
            }`}
            style={{
              transform: "translate3d(0, 0, 0)",
              backfaceVisibility: "hidden",
            }}
          >
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonPopoverCard:
                    "bg-black border border-gray-700 shadow-xl",
                  userButtonPopoverActionButton:
                    "hover:bg-gray-800 text-gray-300",
                  userButtonPopoverActionButtonText: "text-gray-300",
                  userButtonPopoverFooter: "hidden",
                },
              }}
            />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowProfile(true)}
                  className="text-gray-300 text-sm font-medium hover:text-white transition-colors cursor-pointer"
                >
                  Profile
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Small Collapse Toggle Button - Positioned at middle of right border */}
      <motion.button
        initial={false}
        whileHover={{ scale: 1.1, backgroundColor: "rgba(55, 65, 81, 0.9)" }}
        whileTap={{ scale: 0.9 }}
        onClick={handleToggleCollapse}
        className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-6 h-6 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors z-10 shadow-lg"
        style={{
          transform: "translate3d(0, -50%, 0)",
          backfaceVisibility: "hidden",
        }}
      >
        <motion.svg
          animate={{ rotate: isCollapsed ? 0 : 180 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </motion.svg>
      </motion.button>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
            onClick={() => setShowProfile(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="bg-black border border-gray-700 p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto shadow-2xl rounded-lg"
              onClick={(e) => e.stopPropagation()}
              style={{
                transform: "translate3d(0, 0, 0)",
                backfaceVisibility: "hidden",
              }}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-medium text-white">
                  Profile Settings
                </h2>
                <motion.button
                  whileHover={{
                    scale: 1.1,
                    backgroundColor: "rgb(55, 65, 81)",
                  }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowProfile(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg cursor-pointer"
                  style={{ transform: "translate3d(0, 0, 0)" }}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </motion.button>
              </div>
              <UserProfile
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "bg-black border-0 shadow-none",
                    headerTitle: "text-white font-medium",
                    headerSubtitle: "text-gray-400",
                    socialButtonsBlockButton:
                      "bg-gray-900 border-gray-700 text-white hover:bg-gray-800 font-medium",
                    formButtonPrimary:
                      "bg-emerald-600 hover:bg-emerald-700 font-medium",
                    formFieldInput:
                      "bg-gray-900 border-gray-700 text-white font-normal",
                    formFieldLabel: "text-gray-300 font-medium",
                    identityPreviewText: "text-white font-normal",
                    identityPreviewEditButton:
                      "text-emerald-400 hover:text-emerald-300 font-medium",
                    profileSectionTitle: "text-white font-medium",
                    profileSectionContent: "text-gray-300 font-normal",
                    badge: "bg-emerald-600 text-white font-medium",
                    navbarButton:
                      "text-gray-300 hover:text-white hover:bg-gray-800 font-medium",
                    navbarButtonIcon: "text-gray-400",
                    pageScrollBox: "bg-black",
                    page: "bg-black",
                    profilePage: "bg-black",
                  },
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sidebar;
