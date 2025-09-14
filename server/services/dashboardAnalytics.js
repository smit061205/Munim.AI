import { DataService } from "./dataService.js";

export class DashboardAnalytics {
  async getCompleteDashboard(allowedCategories = [], clerkId) {
    const data = {};

    // Add summary totals for frontend
    const totals = await this.calculateTotals(allowedCategories, clerkId);

    return {
      summary: {
        totalCategories: allowedCategories.length,
        dataAvailable: Object.keys(data).length > 0,
        lastUpdated: new Date().toISOString(),
      },
      ...totals,
      ...data,
    };
  }

  async calculateTotals(allowedCategories = [], clerkId) {
    console.log("🧮 DashboardAnalytics.calculateTotals called");
    console.log("📋 Allowed categories:", allowedCategories);
    console.log("🔑 ClerkId:", clerkId);

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalInvestments = 0;
    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    try {
      if (allowedCategories.includes("assets")) {
        console.log("🏦 Processing assets...");
        const assets = await DataService.getAssets(clerkId);
        console.log("✅ Assets data received:", assets);
        totalAssets = assets.reduce(
          (sum, asset) => sum + (asset.currentValue || 0),
          0
        );
        console.log("💰 Total assets calculated:", totalAssets);
      }
    } catch (error) {
      console.error("❌ Error processing assets:", error);
      totalAssets = 0;
    }

    try {
      if (allowedCategories.includes("liabilities")) {
        console.log("💳 Processing liabilities...");
        const liabilities = await DataService.getLiabilities(clerkId);
        console.log("✅ Liabilities data received:", liabilities);
        totalLiabilities = liabilities.reduce(
          (sum, liability) => sum + (liability.currentBalance || 0),
          0
        );
        console.log("💳 Total liabilities calculated:", totalLiabilities);
      }
    } catch (error) {
      console.error("❌ Error processing liabilities:", error);
      totalLiabilities = 0;
    }

    try {
      if (allowedCategories.includes("investments")) {
        console.log("📈 Processing investments...");
        const investments = await DataService.getInvestments(clerkId);
        console.log("✅ Investments data received:", investments);
        totalInvestments = investments.reduce(
          (sum, investment) => sum + (investment.currentValue || 0),
          0
        );
        console.log("📈 Total investments calculated:", totalInvestments);
      }
    } catch (error) {
      console.error("❌ Error processing investments:", error);
      totalInvestments = 0;
    }

    try {
      if (allowedCategories.includes("transactions")) {
        console.log("💸 Processing transactions...");
        const transactions = await DataService.getTransactions(clerkId);
        console.log(
          "✅ Transactions data received:",
          transactions.length,
          "transactions"
        );

        // Debug: Show sample transaction data to understand format
        if (transactions.length > 0) {
          console.log(
            "🔍 Sample transactions:",
            transactions.slice(0, 3).map((t) => ({
              date: t.date,
              dateType: typeof t.date,
              amount: t.amount,
              amountType: typeof t.amount,
              category: t.category,
              description: t.description,
            }))
          );
        }

        const currentMonth = new Date().toISOString().slice(0, 7);
        console.log("📅 Current month filter:", currentMonth);

        // Helper function to check if transaction is current month income
        const isCurrentMonthIncome = (transaction) => {
          const date = transaction.date;
          if (!date) {
            console.log("⚠️ Transaction missing date:", transaction);
            return false;
          }

          let transactionDate;
          if (date instanceof Date) {
            transactionDate = date;
          } else if (typeof date === "string") {
            // Handle different date formats from Excel ingestion
            transactionDate = new Date(date);
            // If invalid date, try parsing DD/MM/YYYY format
            if (isNaN(transactionDate.getTime())) {
              const parts = date.split("/");
              if (parts.length === 3) {
                // Assume DD/MM/YYYY format
                transactionDate = new Date(parts[2], parts[1] - 1, parts[0]);
              }
            }
          } else {
            console.log("⚠️ Invalid date format:", date, typeof date);
            return false;
          }

          if (isNaN(transactionDate.getTime())) {
            console.log("⚠️ Could not parse date:", date);
            return false;
          }

          const currentDate = new Date();
          const isCurrentMonth =
            transactionDate.getFullYear() === currentDate.getFullYear() &&
            transactionDate.getMonth() === currentDate.getMonth();

          // Also include salary from last day of previous month (common pay date)
          const isPreviousMonthSalary =
            transaction.category === "Salary" &&
            transactionDate.getFullYear() === currentDate.getFullYear() &&
            transactionDate.getMonth() === currentDate.getMonth() - 1 &&
            transactionDate.getDate() >= 28; // Last few days of previous month

          const amount = parseFloat(transaction.amount) || 0;
          return (isCurrentMonth || isPreviousMonthSalary) && amount > 0;
        };

        // Helper function to check if transaction is current month expense
        const isCurrentMonthExpense = (transaction) => {
          const date = transaction.date;
          if (!date) {
            console.log("⚠️ Transaction missing date:", transaction);
            return false;
          }

          let transactionDate;
          if (date instanceof Date) {
            transactionDate = date;
          } else if (typeof date === "string") {
            // Handle different date formats from Excel ingestion
            transactionDate = new Date(date);
            // If invalid date, try parsing DD/MM/YYYY format
            if (isNaN(transactionDate.getTime())) {
              const parts = date.split("/");
              if (parts.length === 3) {
                // Assume DD/MM/YYYY format
                transactionDate = new Date(parts[2], parts[1] - 1, parts[0]);
              }
            }
          } else {
            console.log("⚠️ Invalid date format:", date, typeof date);
            return false;
          }

          if (isNaN(transactionDate.getTime())) {
            console.log("⚠️ Could not parse date:", date);
            return false;
          }

          const currentDate = new Date();
          const isCurrentMonth =
            transactionDate.getFullYear() === currentDate.getFullYear() &&
            transactionDate.getMonth() === currentDate.getMonth();

          const amount = parseFloat(transaction.amount) || 0;
          return isCurrentMonth && amount < 0;
        };

        // Filter income transactions
        const incomeTransactions = transactions.filter(isCurrentMonthIncome);
        monthlyIncome = incomeTransactions.reduce(
          (sum, t) => sum + (parseFloat(t.amount) || 0),
          0
        );

        // Filter expense transactions
        const expenseTransactions = transactions.filter(isCurrentMonthExpense);
        monthlyExpenses = expenseTransactions.reduce(
          (sum, t) => sum + Math.abs(parseFloat(t.amount) || 0),
          0
        );

        console.log(
          "💰 Monthly income calculated:",
          monthlyIncome,
          "from",
          incomeTransactions.length,
          "transactions"
        );
        console.log(
          "💸 Monthly expenses calculated:",
          monthlyExpenses,
          "from",
          expenseTransactions.length,
          "transactions"
        );

        // Debug: Show income transactions found
        if (incomeTransactions.length > 0) {
          console.log(
            "🔍 Income transactions found:",
            incomeTransactions.map((t) => ({
              amount: t.amount,
              category: t.category,
              date: t.date,
              description: t.description,
            }))
          );
        }
      }
    } catch (error) {
      console.error("❌ Error processing transactions:", error);
      monthlyIncome = 0;
      monthlyExpenses = 0;
    }

    const result = {
      totalAssets,
      totalLiabilities,
      totalInvestments,
      netWorth: totalAssets - totalLiabilities,
      monthlyIncome,
      monthlyExpenses,
    };

    console.log("📊 Final calculated totals:", result);
    return result;
  }

  async getMonthlySpending(allowedCategories = [], clerkId) {
    if (!allowedCategories.includes("transactions")) {
      return { data: [], message: "Transaction data not available" };
    }

    const transactions = await DataService.getTransactions(clerkId);

    // Group expenses by month
    const monthlyExpenses = {};

    transactions.forEach((transaction) => {
      if (transaction.amount < 0) {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!monthlyExpenses[monthKey]) {
          monthlyExpenses[monthKey] = 0;
        }
        monthlyExpenses[monthKey] += Math.abs(transaction.amount);
      }
    });

    // Sort months and create chart data
    const sortedMonths = Object.keys(monthlyExpenses).sort();
    const labels = sortedMonths.map((month) => {
      const [year, monthNum] = month.split("-");
      return new Date(year, monthNum - 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    });
    const values = sortedMonths.map((month) => monthlyExpenses[month]);

    return {
      labels,
      values,
      monthlyData: sortedMonths.map((month, index) => ({
        month: labels[index],
        expenses: values[index],
      })),
      totalTransactions: transactions.length,
      expenses: transactions.filter((t) => t.amount < 0),
      totalExpenses: transactions
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    };
  }

  async getAssetLiabilityBreakdown(allowedCategories = [], clerkId) {
    let totalAssets = 0;
    let totalLiabilities = 0;

    if (allowedCategories.includes("assets")) {
      const assets = await DataService.getAssets(clerkId);
      totalAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    }

    if (allowedCategories.includes("liabilities")) {
      const liabilities = await DataService.getLiabilities(clerkId);
      totalLiabilities = liabilities.reduce(
        (sum, liability) => sum + liability.currentBalance,
        0
      );
    }

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      assetLiabilityRatio:
        totalLiabilities > 0
          ? (totalAssets / totalLiabilities).toFixed(2)
          : "N/A",
    };
  }

  async getEPFContributions(allowedCategories = [], clerkId) {
    if (!allowedCategories.includes("epf")) {
      return { data: [], message: "EPF data not available" };
    }

    const epfData = await DataService.getEPF(clerkId);
    return {
      currentBalance: epfData.currentBalance || 0,
      employeeContribution: epfData.employee_contribution || 0,
      employerContribution: epfData.employer_contribution || 0,
      totalBalance: epfData.total_balance || 0,
    };
  }

  async getCreditScoreHistory(allowedCategories = [], clerkId) {
    if (!allowedCategories.includes("credit-score")) {
      return { data: [], message: "Credit score data not available" };
    }

    const creditData = await DataService.getCreditScore(clerkId);
    return {
      currentScore: creditData.score || 0,
      paymentHistory: creditData.paymentHistory || "N/A",
      creditUtilization: creditData.creditUtilization || 0,
    };
  }

  async getNetWorthTimeline(allowedCategories = [], clerkId) {
    const hasAssets = allowedCategories.includes("assets");
    const hasLiabilities = allowedCategories.includes("liabilities");

    if (!hasAssets && !hasLiabilities) {
      return { data: [], message: "Asset and liability data not available" };
    }

    // Get actual user data
    let actualAssets = 0;
    let actualLiabilities = 0;

    if (hasAssets) {
      const assets = await DataService.getAssets(clerkId);
      actualAssets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    }

    if (hasLiabilities) {
      const liabilities = await DataService.getLiabilities(clerkId);
      actualLiabilities = liabilities.reduce(
        (sum, liability) => sum + liability.currentBalance,
        0
      );
    }

    const actualNetWorth = actualAssets - actualLiabilities;

    // Generate timeline data for the last 12 months
    const months = [];
    const netWorthData = [];
    const currentDate = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      months.push(monthLabel);

      // Simulate gradual growth to current net worth
      const growthFactor = (12 - i) / 12;
      const monthlyNetWorth = actualNetWorth * (0.7 + 0.3 * growthFactor);
      netWorthData.push(Math.round(monthlyNetWorth));
    }

    return {
      labels: months,
      values: netWorthData,
      currentNetWorth: actualNetWorth,
      totalAssets: actualAssets,
      totalLiabilities: actualLiabilities,
      monthlyData: months.map((month, index) => ({
        month,
        netWorth: netWorthData[index],
      })),
    };
  }

  async getSpendingByCategory(allowedCategories = [], clerkId) {
    if (!allowedCategories.includes("transactions")) {
      return { data: [], message: "Transaction data not available" };
    }

    const transactions = await DataService.getTransactions(clerkId);
    const categorySpending = {};

    transactions.forEach((transaction) => {
      if (transaction.amount < 0) {
        const category = transaction.category || "Other";
        categorySpending[category] =
          (categorySpending[category] || 0) + Math.abs(transaction.amount);
      }
    });

    // Create chart-ready data with colors
    const colors = [
      "rgba(16, 185, 129, 0.8)",
      "rgba(79, 70, 229, 0.8)",
      "rgba(245, 158, 11, 0.8)",
      "rgba(239, 68, 68, 0.8)",
      "rgba(168, 85, 247, 0.8)",
      "rgba(236, 72, 153, 0.8)",
      "rgba(14, 165, 233, 0.8)",
      "rgba(34, 197, 94, 0.8)",
      "rgba(156, 163, 175, 0.8)",
      "rgba(251, 146, 60, 0.8)",
    ];

    const categoryEntries = Object.entries(categorySpending);
    const chartData = categoryEntries.map(([name, amount], index) => ({
      name,
      amount,
      color: colors[index % colors.length],
    }));

    return {
      categories: chartData,
      labels: chartData.map((item) => item.name),
      values: chartData.map((item) => item.amount),
      colors: chartData.map((item) => item.color),
      spending: categorySpending,
      totalSpending: Object.values(categorySpending).reduce((a, b) => a + b, 0),
      totalCategories: Object.keys(categorySpending).length,
    };
  }
}
