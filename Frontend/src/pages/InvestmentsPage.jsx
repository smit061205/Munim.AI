import React, { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { usePermissions } from "../context/PermissionsContext";
import { useAIChat } from "../context/AIChatContext";
import { motion, AnimatePresence } from "framer-motion";
import { createAuthenticatedApi } from "../services/api";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import AIChatSidebar from "../components/AIChatSidebar";

const InvestmentsPage = () => {
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
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInvestment, setNewInvestment] = useState({
    type: "stock",
    symbol: "",
    company_name: "",
    quantity: "",
    current_value: "",
    purchase_price: "",
    sector: "",
    scheme_name: "",
    scheme_code: "",
    units: "",
    nav: "",
    category: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    console.log("🔄 InvestmentsPage useEffect triggered");
    console.log("🔐 Auth state:", {
      isLoaded,
      isSignedIn,
    });
    console.log("🔑 Permissions:", permissions);
    console.log("💼 permissions.investments:", permissions.investments);

    const fetchInvestments = async () => {
      if (!isLoaded || !isSignedIn || !permissions.investments) {
        console.log("❌ Fetch blocked - Auth check failed:", {
          isLoaded,
          isSignedIn,
          hasInvestmentPermission: permissions.investments,
        });
        return;
      }

      console.log("✅ Starting investments fetch...");
      setLoading(true);
      try {
        const token = await getToken();
        console.log("🔑 Got token:", !!token);
        const authApi = createAuthenticatedApi(() => Promise.resolve(token));
        const response = await authApi.get("/data/investments");

        console.log("🔍 Investments API Response:", response.data);
        console.log("📊 Raw investments data:", response.data.data);

        if (response.data && response.data.data) {
          // Process investments data from the nested structure
          const processedInvestments = [];

          // Handle the data as a single document or array of documents
          const investmentsData = Array.isArray(response.data.data)
            ? response.data.data
            : [response.data.data];

          investmentsData.forEach((doc, docIndex) => {
            console.log(`📈 Processing investment doc ${docIndex}:`, doc);
            if (doc.portfolio) {
              console.log(`📊 Portfolio structure:`, doc.portfolio);
              console.log(`📊 Portfolio keys:`, Object.keys(doc.portfolio));
              console.log(`📊 Portfolio.stocks:`, doc.portfolio.stocks);
              console.log(
                `📊 Portfolio.mutual_funds:`,
                doc.portfolio.mutual_funds,
              );

              // Process stocks
              if (doc.portfolio.stocks) {
                console.log(`📈 Found ${doc.portfolio.stocks.length} stocks`);
                doc.portfolio.stocks.forEach((stock, index) => {
                  const currentValue = stock.current_value || 0;
                  const quantity = stock.quantity || 0;
                  const avgPrice = quantity > 0 ? currentValue / quantity : 0;

                  processedInvestments.push({
                    id: `stock_${docIndex}_${index}`,
                    name: stock.company_name || stock.symbol || "Unknown Stock",
                    type: "Stock",
                    symbol: stock.symbol || "N/A",
                    units: quantity,
                    avgPrice: avgPrice,
                    currentPrice: avgPrice, // Assuming current price same as avg for now
                    totalInvested: currentValue,
                    currentValue: currentValue,
                    gainLoss: 0, // No historical data available
                    gainLossPercent: 0,
                    sector: stock.sector || "Unknown",
                  });
                });
              }

              // Process mutual funds
              if (doc.portfolio.mutual_funds) {
                console.log(
                  `📈 Found ${doc.portfolio.mutual_funds.length} mutual funds`,
                );
                doc.portfolio.mutual_funds.forEach((mf, index) => {
                  const currentValue = mf.current_value || 0;
                  const units = mf.units || 0;
                  const navPrice = units > 0 ? currentValue / units : 0;

                  processedInvestments.push({
                    id: `mf_${docIndex}_${index}`,
                    name: mf.scheme_name || "Unknown Mutual Fund",
                    type: "Mutual Fund",
                    symbol: mf.scheme_code || "N/A",
                    units: units,
                    avgPrice: navPrice,
                    currentPrice: navPrice,
                    totalInvested: currentValue,
                    currentValue: currentValue,
                    gainLoss: 0,
                    gainLossPercent: 0,
                    sector: mf.category || "Diversified",
                  });
                });
              }
            } else {
              console.log(`❌ No portfolio found in doc ${docIndex}`);
            }
          });

          console.log("📈 Processed investments data:", processedInvestments);
          setInvestments(processedInvestments);
        } else {
          console.log("⚠️ No investments data found in response");
        }
      } catch (error) {
        console.error("❌ Error fetching investments:", error);
        console.error(
          "❌ Error details:",
          error.response?.data || error.message,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInvestments();
    console.log("🏁 InvestmentsPage useEffect completed");
  }, [permissions, isLoaded, isSignedIn]);

  const totalInvested = investments.reduce(
    (sum, inv) => sum + inv.totalInvested,
    0,
  );
  const currentValue = investments.reduce(
    (sum, inv) => sum + inv.currentValue,
    0,
  );
  const totalGainLoss = currentValue - totalInvested;
  const totalGainLossPercent =
    totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  const getGainLossColor = (value) => {
    return value >= 0 ? "text-emerald-400" : "text-red-400";
  };

  const getSectorColor = (sector) => {
    const colors = {
      Diversified: "bg-blue-900/50 text-blue-300 border border-blue-800",
      Energy: "bg-orange-900/50 text-orange-300 border border-orange-800",
      Banking: "bg-green-900/50 text-green-300 border border-green-800",
      "Small Cap": "bg-purple-900/50 text-purple-300 border border-purple-800",
      Commodities: "bg-yellow-900/50 text-yellow-300 border border-yellow-800",
    };
    return colors[sector] || "bg-gray-800 text-gray-400 border border-gray-700";
  };

  const handleAddInvestment = () => {
    setShowCreateModal(true);
    setCreateError(null);
  };

  const handleCreateInvestment = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const token = await user.getToken();
      const api = createAuthenticatedApi(token);

      const response = await api.post("/investments", newInvestment);
      if (response.data.success) {
        const docIndex = Date.now(); // random ID prefix
        const index = 0;
        const newDoc = response.data.data;

        // Cast into frontend flat structure
        let formattedInvestment;

        if (newInvestment.type === "stock") {
          const currentValue = newDoc.current_value || 0;
          const quantity = newDoc.quantity || 0;
          const avgPrice = quantity > 0 ? currentValue / quantity : 0;

          formattedInvestment = {
            id: `stock_${docIndex}_${index}`,
            name: newDoc.company_name || newDoc.symbol || "Unknown Stock",
            type: "Stock",
            symbol: newDoc.symbol || "N/A",
            units: quantity,
            avgPrice: avgPrice,
            currentPrice: avgPrice,
            totalInvested: currentValue,
            currentValue: currentValue,
            gainLoss: 0,
            gainLossPercent: 0,
            sector: newDoc.sector || "Unknown",
          };
        } else {
          const currentValue = newDoc.current_value || 0;
          const units = newDoc.units || 0;
          const navPrice = units > 0 ? currentValue / units : 0;

          formattedInvestment = {
            id: `mf_${docIndex}_${index}`,
            name: newDoc.scheme_name || "Unknown Mutual Fund",
            type: "Mutual Fund",
            symbol: newDoc.scheme_code || "N/A",
            units: units,
            avgPrice: navPrice,
            currentPrice: navPrice,
            totalInvested: currentValue,
            currentValue: currentValue,
            gainLoss: 0,
            gainLossPercent: 0,
            sector: newDoc.category || "Diversified",
          };
        }

        setInvestments((prev) => [...prev, formattedInvestment]);

        setShowCreateModal(false);
        setNewInvestment({
          type: "stock",
          symbol: "",
          company_name: "",
          quantity: "",
          current_value: "",
          purchase_price: "",
          sector: "",
          scheme_name: "",
          scheme_code: "",
          units: "",
          nav: "",
          category: "",
        });
        alert("Investment created successfully!");
      }
    } catch (error) {
      console.error("Error creating investment:", error);
      setCreateError(
        error.response?.data?.message || "Failed to create investment",
      );
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-black relative">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onAIToggle={toggleAIChat}
        isAIChatOpen={isAIChatOpen}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      <div className="flex-1 overflow-auto bg-black">
        <Navbar
          title="Investments"
          subtitle="Track and manage your investment portfolio performance."
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        {/* Content */}
        <div className="p-4 md:p-8 bg-black">
          {/* Portfolio Summary */}
          <div className="mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Total Invested
                </h3>
                <p className="text-3xl font-semibold text-white mb-2">
                  ₹{totalInvested.toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">Principal amount</p>
              </div>
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Current Value
                </h3>
                <p className="text-3xl font-semibold text-white mb-2">
                  ₹{currentValue.toLocaleString()}
                </p>
                <p className="text-gray-400 text-sm">Market value</p>
              </div>
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Total Gain/Loss
                </h3>
                <p
                  className={`text-3xl font-semibold mb-2 ${getGainLossColor(
                    totalGainLoss,
                  )}`}
                >
                  {totalGainLoss >= 0 ? "+" : ""}₹
                  {Math.abs(totalGainLoss).toLocaleString()}
                </p>
                <p className={`text-sm ${getGainLossColor(totalGainLoss)}`}>
                  {totalGainLossPercent >= 0 ? "+" : ""}
                  {totalGainLossPercent.toFixed(2)}%
                </p>
              </div>
              <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl">
                <h3 className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                  Holdings
                </h3>
                <p className="text-3xl font-semibold text-white mb-2">
                  {investments.length}
                </p>
                <p className="text-gray-400 text-sm">Active positions</p>
              </div>
            </div>
          </div>

          {/* Holdings Table */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-white">Your Holdings</h2>
              <button
                onClick={handleAddInvestment}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-medium transition-colors"
              >
                Add Investment
              </button>
            </div>

            <div className="bg-gray-950 border border-gray-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-gray-300 font-medium uppercase tracking-wide text-sm">
                        Investment
                      </th>
                      <th className="px-6 py-4 text-left text-gray-300 font-medium uppercase tracking-wide text-sm">
                        Type
                      </th>
                      <th className="px-6 py-4 text-right text-gray-300 font-medium uppercase tracking-wide text-sm">
                        Units
                      </th>
                      <th className="px-6 py-4 text-right text-gray-300 font-medium uppercase tracking-wide text-sm">
                        Avg Price
                      </th>
                      <th className="px-6 py-4 text-right text-gray-300 font-medium uppercase tracking-wide text-sm">
                        Current Price
                      </th>
                      <th className="px-6 py-4 text-right text-gray-300 font-medium uppercase tracking-wide text-sm">
                        Invested
                      </th>
                      <th className="px-6 py-4 text-right text-gray-300 font-medium uppercase tracking-wide text-sm">
                        Current Value
                      </th>
                      <th className="px-6 py-4 text-right text-gray-300 font-medium uppercase tracking-wide text-sm">
                        Gain/Loss
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {investments.map((investment) => (
                      <tr
                        key={investment.id}
                        className="hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">
                              {investment.name}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {investment.symbol}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 text-xs font-medium uppercase tracking-wide ${getSectorColor(
                              investment.sector,
                            )}`}
                          >
                            {investment.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-white font-medium">
                          {investment.units}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-300">
                          ₹{investment.avgPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-white font-medium">
                          ₹{investment.currentPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-300">
                          ₹{investment.totalInvested.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-white font-semibold">
                          ₹{investment.currentValue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div>
                            <p
                              className={`font-semibold ${getGainLossColor(
                                investment.gainLoss,
                              )}`}
                            >
                              {investment.gainLoss >= 0 ? "+" : ""}₹
                              {Math.abs(investment.gainLoss).toLocaleString()}
                            </p>
                            <p
                              className={`text-sm ${getGainLossColor(
                                investment.gainLoss,
                              )}`}
                            >
                              {investment.gainLossPercent >= 0 ? "+" : ""}
                              {investment.gainLossPercent.toFixed(2)}%
                            </p>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Portfolio Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Asset Allocation */}
            <div className="bg-gray-950 border border-gray-800 shadow-xl">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-lg font-medium text-white">
                  Asset Allocation
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {["Stock", "Mutual Fund", "ETF"].map((type) => {
                    const typeInvestments = investments.filter(
                      (inv) => inv.type === type,
                    );
                    const typeValue = typeInvestments.reduce(
                      (sum, inv) => sum + inv.currentValue,
                      0,
                    );
                    const percentage =
                      currentValue > 0 ? (typeValue / currentValue) * 100 : 0;

                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-4 h-4 ${
                              type === "Stock"
                                ? "bg-blue-500"
                                : type === "Mutual Fund"
                                  ? "bg-emerald-500"
                                  : "bg-yellow-500"
                            }`}
                          ></div>
                          <span className="text-white font-medium">{type}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            ₹{typeValue.toLocaleString()}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-gray-950 border border-gray-800 shadow-xl">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-lg font-medium text-white">
                  Top Performers
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {investments
                    .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
                    .slice(0, 3)
                    .map((investment) => (
                      <div
                        key={investment.id}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <p className="text-white font-medium">
                            {investment.name}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {investment.symbol}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-semibold ${getGainLossColor(
                              investment.gainLoss,
                            )}`}
                          >
                            {investment.gainLossPercent >= 0 ? "+" : ""}
                            {investment.gainLossPercent.toFixed(2)}%
                          </p>
                          <p
                            className={`text-sm ${getGainLossColor(
                              investment.gainLoss,
                            )}`}
                          >
                            ₹{Math.abs(investment.gainLoss).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
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

      {showCreateModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-gray-950 p-6 border border-gray-800 shadow-xl w-1/2">
            <h3 className="text-lg font-medium text-white mb-4">
              Create New Investment
            </h3>
            <form onSubmit={handleCreateInvestment}>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                    Type
                  </label>
                  <select
                    className="w-full p-2 text-gray-300 font-medium bg-gray-800 border border-gray-700"
                    value={newInvestment.type}
                    onChange={(e) =>
                      setNewInvestment({
                        ...newInvestment,
                        type: e.target.value,
                      })
                    }
                  >
                    <option value="stock">Stock</option>
                    <option value="mutual_fund">Mutual Fund</option>
                  </select>
                </div>

                {newInvestment.type === "stock" && (
                  <>
                    <div>
                      <label className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                        Symbol
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full p-2 text-gray-300 font-medium bg-gray-800 border border-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={newInvestment.symbol}
                        onChange={(e) =>
                          setNewInvestment({
                            ...newInvestment,
                            symbol: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                        Company Name
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full p-2 text-gray-300 font-medium bg-gray-800 border border-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={newInvestment.company_name}
                        onChange={(e) =>
                          setNewInvestment({
                            ...newInvestment,
                            company_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                        Quantity
                      </label>
                      <input
                        type="number"
                        required
                        className="w-full p-2 text-gray-300 font-medium bg-gray-800 border border-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={newInvestment.quantity}
                        onChange={(e) =>
                          setNewInvestment({
                            ...newInvestment,
                            quantity: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                        Current Value (₹)
                      </label>
                      <input
                        type="number"
                        required
                        className="w-full p-2 text-gray-300 font-medium bg-gray-800 border border-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={newInvestment.current_value}
                        onChange={(e) =>
                          setNewInvestment({
                            ...newInvestment,
                            current_value: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                        Purchase Price (₹)
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 text-gray-300 font-medium bg-gray-800 border border-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={newInvestment.purchase_price}
                        onChange={(e) =>
                          setNewInvestment({
                            ...newInvestment,
                            purchase_price: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                        Sector
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 text-gray-300 font-medium bg-gray-800 border border-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={newInvestment.sector}
                        onChange={(e) =>
                          setNewInvestment({
                            ...newInvestment,
                            sector: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {newInvestment.type === "mutual_fund" && (
                  <>
                    <div>
                      <label className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                        Scheme Name
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full p-2 text-gray-300 font-medium bg-gray-800 border border-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={newInvestment.scheme_name}
                        onChange={(e) =>
                          setNewInvestment({
                            ...newInvestment,
                            scheme_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                        Scheme Code
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 text-gray-300 font-medium bg-gray-800 border border-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={newInvestment.scheme_code}
                        onChange={(e) =>
                          setNewInvestment({
                            ...newInvestment,
                            scheme_code: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                        Units
                      </label>
                      <input
                        type="number"
                        required
                        className="w-full p-2 text-gray-300 font-medium bg-gray-800 border border-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={newInvestment.units}
                        onChange={(e) =>
                          setNewInvestment({
                            ...newInvestment,
                            units: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                        Current Value (₹)
                      </label>
                      <input
                        type="number"
                        required
                        className="w-full p-2 text-gray-300 font-medium bg-gray-800 border border-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={newInvestment.current_value}
                        onChange={(e) =>
                          setNewInvestment({
                            ...newInvestment,
                            current_value: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                        NAV (₹)
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 text-gray-300 font-medium bg-gray-800 border border-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={newInvestment.nav}
                        onChange={(e) =>
                          setNewInvestment({
                            ...newInvestment,
                            nav: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm font-medium mb-2 uppercase tracking-wide">
                        Category
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 text-gray-300 font-medium bg-gray-800 border border-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={newInvestment.category}
                        onChange={(e) =>
                          setNewInvestment({
                            ...newInvestment,
                            category: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {createLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    "Create Investment"
                  )}
                </button>
              </div>
              {createError && (
                <p className="text-red-400 text-sm mt-2">{createError}</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentsPage;
