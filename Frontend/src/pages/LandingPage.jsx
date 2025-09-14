import React from "react";
import { Link } from "react-router-dom";
import { SignInButton, SignUpButton, useAuth } from "@clerk/clerk-react";
import { motion } from "framer-motion";

const LandingPage = () => {
  const { isSignedIn } = useAuth();

  const features = [
    {
      icon: (
        <svg
          className="w-10 h-10"
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
      title: "Smart Analytics",
      description:
        "Get comprehensive insights into your financial health with AI-powered analytics and intelligent forecasting.",
    },
    {
      icon: (
        <svg
          className="w-10 h-10"
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
      title: "Expense Tracking",
      description:
        "Automatically track and categorize all your expenses for smarter budgeting and financial planning.",
    },
    {
      icon: (
        <svg
          className="w-10 h-10"
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
      title: "Investment Portfolio",
      description:
        "Monitor your investments in real-time, track performance, and receive personalized recommendations.",
    },
    {
      icon: (
        <svg
          className="w-10 h-10"
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
      title: "AI Assistant",
      description:
        "Chat with Munimji, your intelligent financial advisor for instant insights and personalized advice.",
    },
    {
      icon: (
        <svg
          className="w-10 h-10"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      title: "Secure & Private",
      description:
        "Enterprise-grade security with end-to-end encryption. Your financial data remains completely private.",
    },
    {
      icon: (
        <svg
          className="w-10 h-10"
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
      title: "Comprehensive Reports",
      description:
        "Generate detailed financial reports and export data for seamless tax filing and strategic planning.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Navigation */}
      <nav className="bg-black/95 backdrop-blur-sm border-b border-gray-800/50 px-6 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="/Gemini_Generated_Image_ko4f0gko4f0gko4f.png"
              alt="Munim.AI Logo"
              className="w-20 h-20 rounded-xl"
            />
            <span className="text-2xl font-medium text-white tracking-tight">
              Munim.AI
            </span>
          </div>

          {!isSignedIn ? (
            <div className="flex items-center space-x-6">
              <SignInButton mode="modal">
                <button className="text-gray-300 hover:text-white transition-colors px-4 py-2 font-medium">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-2.5 rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-emerald-600/25">
                  Get Started
                </button>
              </SignUpButton>
            </div>
          ) : (
            <Link to="/dashboard">
              <button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-6 py-2.5 rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-emerald-600/25">
                Go to Dashboard
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-24 bg-gradient-to-b from-black via-gray-950/50 to-black relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/10 via-transparent to-emerald-900/10"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl"></div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-6xl md:text-8xl font-medium mb-8 leading-tight">
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Your AI-Powered
              </span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                Financial Assistant
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
              Take complete control of your finances with intelligent insights,
              automated tracking, and personalized recommendations powered by
              cutting-edge artificial intelligence.
            </p>

            {!isSignedIn ? (
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <SignUpButton mode="modal">
                  <button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-10 py-4 rounded-xl text-lg font-medium transition-all duration-300 shadow-2xl hover:shadow-emerald-600/30 hover:scale-105 transform">
                    Start Free Trial
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="border-2 border-gray-600 hover:border-emerald-500 text-white hover:text-emerald-400 px-10 py-4 rounded-xl text-lg font-medium transition-all duration-300 hover:bg-emerald-500/5">
                    Sign In
                  </button>
                </SignInButton>
              </div>
            ) : (
              <Link to="/dashboard">
                <button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-10 py-4 rounded-xl text-lg font-medium transition-all duration-300 shadow-2xl hover:shadow-emerald-600/30 hover:scale-105 transform">
                  Go to Dashboard
                </button>
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-24 bg-black relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-5xl md:text-6xl font-medium text-white mb-8 leading-tight">
                Everything you need to
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                  manage your finances
                </span>
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-light">
                From expense tracking to investment monitoring, Munim.AI
                provides comprehensive financial management tools powered by
                artificial intelligence.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-gray-950 to-gray-900/50 p-8 rounded-2xl border border-gray-800/50 hover:border-emerald-600/50 transition-all duration-300 group hover:shadow-2xl hover:shadow-emerald-600/10 backdrop-blur-sm"
              >
                <div className="text-emerald-400 mb-6 group-hover:text-emerald-300 transition-colors group-hover:scale-110 transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-medium text-white mb-4 group-hover:text-emerald-50 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed font-light group-hover:text-gray-300 transition-colors">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 bg-gradient-to-r from-emerald-900/20 via-emerald-800/30 to-emerald-900/20 border-t border-gray-800/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-600/5 to-transparent"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-medium text-white mb-8 leading-tight">
              Ready to transform
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                your finances?
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-12 font-light leading-relaxed">
              Join thousands of users who trust Munim.AI to manage their
              financial future with confidence.
            </p>

            {!isSignedIn ? (
              <SignUpButton mode="modal">
                <button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-12 py-5 rounded-xl text-xl font-medium transition-all duration-300 shadow-2xl hover:shadow-emerald-600/30 hover:scale-105 transform">
                  Get Started Today
                </button>
              </SignUpButton>
            ) : (
              <Link to="/dashboard">
                <button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-12 py-5 rounded-xl text-xl font-medium transition-all duration-300 shadow-2xl hover:shadow-emerald-600/30 hover:scale-105 transform">
                  Access Your Dashboard
                </button>
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800/50 px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <img
                src="/Gemini_Generated_Image_ko4f0gko4f0gko4f.png"
                alt="Munim.AI Logo"
                className="w-20 h-20 rounded-xl"
              />
              <span className="text-2xl font-medium text-white tracking-tight">
                Munim.AI
              </span>
            </div>
            <p className="text-gray-400 font-light">
              2025 Munim.AI. All rights reserved. Your AI-powered financial
              companion.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
