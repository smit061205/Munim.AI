import { DataService } from "./dataService.js";

export class DashboardAnalytics {
  async getCompleteDashboard(allowedCategories = [], clerkId) {
    const data = {};

    if (allowedCategories.includes("transactions")) {
      data.monthlySpending = await this.getMonthlySpending(
        allowedCategories,
        clerkId
      );
      data.spendingCategories = await this.getSpendingByCategory(
        allowedCategories,
        clerkId
      );
    }

    if (
      allowedCategories.includes("assets") ||
      allowedCategories.includes("liabilities")
    ) {
      data.assetLiability = await this.getAssetLiabilityBreakdown(
        allowedCategories,
        clerkId
      );
      data.netWorth = await this.getNetWorthTimeline(
        allowedCategories,
        clerkId
      );
    }

    if (allowedCategories.includes("epf")) {
      data.epfContributions = await this.getEPFContributions(
        allowedCategories,
        clerkId
      );
    }

    if (allowedCategories.includes("credit-score")) {
      data.creditScore = await this.getCreditScoreHistory(
        allowedCategories,
        clerkId
      );
    }

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
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalInvestments = 0;
    let monthlyIncome = 0;
    let monthlyExpenses = 0;

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

    if (allowedCategories.includes("investments")) {
      const investments = await DataService.getInvestments(clerkId);
      totalInvestments = investments.reduce(
        (sum, investment) => sum + investment.currentValue,
        0
      );
    }

    if (allowedCategories.includes("transactions")) {
      const transactions = await DataService.getTransactions(clerkId);
      const currentMonth = new Date().toISOString().slice(0, 7);

      monthlyIncome = transactions
        .filter((t) => t.date?.startsWith(currentMonth) && t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyExpenses = transactions
        .filter((t) => t.date?.startsWith(currentMonth) && t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    }

    return {
      totalAssets,
      totalLiabilities,
      totalInvestments,
      netWorth: totalAssets - totalLiabilities,
      monthlyIncome,
      monthlyExpenses,
    };
  }

  async getMonthlySpending(allowedCategories = [], clerkId) {
    if (!allowedCategories.includes("transactions")) {
      return { data: [], message: "Transaction data not available" };
    }

    const transactions = await DataService.getTransactions(clerkId);
    const monthlyData = {};

    transactions.forEach((transaction) => {
      if (transaction.amount < 0) {
        // Only expenses
        const month = new Date(transaction.date).toISOString().slice(0, 7);
        monthlyData[month] =
          (monthlyData[month] || 0) + Math.abs(transaction.amount);
      }
    });

    // Handle case where no monthly data exists
    if (Object.keys(monthlyData).length === 0) {
      return {
        chartType: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Monthly Spending",
              data: [],
              borderColor: "rgb(75, 192, 192)",
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              tension: 0.1,
            },
          ],
        },
        metadata: {
          totalMonths: 0,
          averageSpending: 0,
          highestMonth: 0,
          lowestMonth: 0,
        },
      };
    }

    const chartData = {
      labels: Object.keys(monthlyData).sort(),
      datasets: [
        {
          label: "Monthly Spending",
          data: Object.keys(monthlyData)
            .sort()
            .map((month) => monthlyData[month]),
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.1,
        },
      ],
    };

    const monthlyValues = Object.values(monthlyData);
    const monthCount = Object.keys(monthlyData).length;

    return {
      chartType: "line",
      data: chartData,
      metadata: {
        totalMonths: monthCount,
        averageSpending:
          monthCount > 0
            ? monthlyValues.reduce((a, b) => a + b, 0) / monthCount
            : 0,
        highestMonth: monthlyValues.length > 0 ? Math.max(...monthlyValues) : 0,
        lowestMonth: monthlyValues.length > 0 ? Math.min(...monthlyValues) : 0,
      },
    };
  }

  async getAssetLiabilityBreakdown(allowedCategories = [], clerkId) {
    const data = { assets: 0, liabilities: 0 };

    if (allowedCategories.includes("assets")) {
      const assets = await DataService.getAssets(clerkId);
      data.assets = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    }

    if (allowedCategories.includes("liabilities")) {
      const liabilities = await DataService.getLiabilities(clerkId);
      data.liabilities = liabilities.reduce(
        (sum, liability) => sum + liability.currentBalance,
        0
      );
    }

    const chartData = {
      labels: ["Assets", "Liabilities"],
      datasets: [
        {
          data: [data.assets, data.liabilities],
          backgroundColor: ["#36A2EB", "#FF6384"],
          borderWidth: 1,
        },
      ],
    };

    return {
      chartType: "bar",
      data: chartData,
      metadata: {
        netWorth: data.assets - data.liabilities,
        assetLiabilityRatio:
          data.liabilities > 0
            ? (data.assets / data.liabilities).toFixed(2)
            : "N/A",
        totalAssets: data.assets,
        totalLiabilities: data.liabilities,
      },
    };
  }

  async getEPFContributions(allowedCategories = [], clerkId) {
    if (!allowedCategories.includes("epf")) {
      return { data: [], message: "EPF data not available" };
    }

    const epfData = await DataService.getEPF(clerkId);
    const monthlyContributions = {};

    // Generate 12 months of mock EPF data
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toISOString().slice(0, 7);
      monthlyContributions[month] = {
        employee: Math.floor(Math.random() * 500) + 1000,
        employer: Math.floor(Math.random() * 500) + 1000,
      };
    }

    const chartData = {
      labels: Object.keys(monthlyContributions),
      datasets: [
        {
          label: "Employee Contribution",
          data: Object.values(monthlyContributions).map((m) => m.employee),
          backgroundColor: "rgba(54, 162, 235, 0.8)",
        },
        {
          label: "Employer Contribution",
          data: Object.values(monthlyContributions).map((m) => m.employer),
          backgroundColor: "rgba(255, 99, 132, 0.8)",
        },
      ],
    };

    return {
      chartType: "bar",
      data: chartData,
      metadata: {
        totalContributions: Object.values(monthlyContributions).reduce(
          (sum, m) => sum + m.employee + m.employer,
          0
        ),
        averageMonthly:
          Object.values(monthlyContributions).reduce(
            (sum, m) => sum + m.employee + m.employer,
            0
          ) / 12,
        currentBalance: epfData.currentBalance || 0,
      },
    };
  }

  async getCreditScoreHistory(allowedCategories = [], clerkId) {
    if (!allowedCategories.includes("credit-score")) {
      return { data: [], message: "Credit score data not available" };
    }

    const creditData = await DataService.getCreditScore(clerkId);
    const history = {};

    // Generate 12 months of credit score history
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toISOString().slice(0, 7);
      const baseScore = creditData.score || 750;
      history[month] = Math.max(
        300,
        Math.min(850, baseScore + Math.floor(Math.random() * 40) - 20)
      );
    }

    const chartData = {
      labels: Object.keys(history),
      datasets: [
        {
          label: "Credit Score",
          data: Object.values(history),
          borderColor: "rgb(255, 206, 86)",
          backgroundColor: "rgba(255, 206, 86, 0.2)",
          tension: 0.1,
          fill: true,
        },
      ],
    };

    return {
      chartType: "line",
      data: chartData,
      metadata: {
        currentScore: Object.values(history)[Object.values(history).length - 1],
        highestScore: Math.max(...Object.values(history)),
        lowestScore: Math.min(...Object.values(history)),
        trend:
          Object.values(history)[Object.values(history).length - 1] >
          Object.values(history)[0]
            ? "improving"
            : "declining",
      },
    };
  }

  async getNetWorthTimeline(allowedCategories = [], clerkId) {
    const hasAssets = allowedCategories.includes("assets");
    const hasLiabilities = allowedCategories.includes("liabilities");

    if (!hasAssets && !hasLiabilities) {
      return { data: [], message: "Asset and liability data not available" };
    }

    const timeline = {};

    // Generate 12 months of net worth data
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toISOString().slice(0, 7);

      let assets = 0;
      let liabilities = 0;

      if (hasAssets) {
        assets = Math.floor(Math.random() * 50000) + 100000;
      }

      if (hasLiabilities) {
        liabilities = Math.floor(Math.random() * 20000) + 30000;
      }

      timeline[month] = assets - liabilities;
    }

    const chartData = {
      labels: Object.keys(timeline),
      datasets: [
        {
          label: "Net Worth",
          data: Object.values(timeline),
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.1,
          fill: true,
        },
      ],
    };

    return {
      chartType: "line",
      data: chartData,
      metadata: {
        currentNetWorth:
          Object.values(timeline)[Object.values(timeline).length - 1],
        highestNetWorth: Math.max(...Object.values(timeline)),
        lowestNetWorth: Math.min(...Object.values(timeline)),
        growth:
          Object.values(timeline)[Object.values(timeline).length - 1] -
          Object.values(timeline)[0],
      },
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
        // Only expenses
        const category = transaction.category || "Other";
        categorySpending[category] =
          (categorySpending[category] || 0) + Math.abs(transaction.amount);
      }
    });

    // Handle case where no spending data exists
    if (Object.keys(categorySpending).length === 0) {
      return {
        chartType: "doughnut",
        data: {
          labels: [],
          datasets: [
            {
              data: [],
              backgroundColor: [],
            },
          ],
        },
        metadata: {
          totalCategories: 0,
          totalSpending: 0,
          topCategory: null,
          averagePerCategory: 0,
        },
      };
    }

    const chartData = {
      labels: Object.keys(categorySpending),
      datasets: [
        {
          data: Object.values(categorySpending),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#FF6384",
            "#C9CBCF",
          ],
        },
      ],
    };

    const totalSpending = Object.values(categorySpending).reduce(
      (a, b) => a + b,
      0
    );
    const categoryCount = Object.keys(categorySpending).length;

    return {
      chartType: "doughnut",
      data: chartData,
      metadata: {
        totalCategories: categoryCount,
        totalSpending,
        topCategory: Object.keys(categorySpending).reduce((a, b) =>
          categorySpending[a] > categorySpending[b] ? a : b
        ),
        averagePerCategory:
          categoryCount > 0 ? totalSpending / categoryCount : 0,
      },
    };
  }

  static async getDashboardData(clerkId) {
    try {
      console.log("🎯 DashboardAnalytics.getDashboardData called");

      const [assets, liabilities, epf, creditScore] = await Promise.all([
        DataService.getAssets(clerkId),
        DataService.getLiabilities(clerkId),
        DataService.getEPF(clerkId),
        DataService.getCreditScore(clerkId),
      ]);

      console.log("📊 Raw data fetched:", {
        assetsCount: assets.length,
        liabilitiesCount: liabilities.length,
        epfData: epf,
        creditScore: creditScore,
      });

      const totalAssets = assets.reduce(
        (sum, asset) => sum + asset.currentValue,
        0
      );
      const totalLiabilities = liabilities.reduce(
        (sum, liability) => sum + liability.currentBalance,
        0
      );
      const netWorth = totalAssets - totalLiabilities;

      const dashboardData = {
        totalAssets,
        totalLiabilities,
        netWorth,
        epfBalance: epf.currentBalance || 0,
        creditScore: creditScore.score || 750,
        monthlyIncome: 75000, // This should come from transactions analysis
        monthlyExpenses: 45000, // This should come from transactions analysis
      };

      console.log("📈 Processed dashboard data:", dashboardData);
      return dashboardData;
    } catch (error) {
      console.error("❌ Error in getDashboardData:", error);
      throw error;
    }
  }

  static async getMonthlySpending(clerkId) {
    try {
      console.log("📅 DashboardAnalytics.getMonthlySpending called");

      const transactions = await DataService.getTransactions(clerkId);
      console.log("💸 Transactions for monthly spending:", {
        totalTransactions: transactions.length,
        sampleTransactions: transactions.slice(0, 3),
      });

      // Group transactions by month
      const monthlyData = {};

      transactions.forEach((transaction) => {
        if (transaction.amount < 0) {
          // Only expenses (negative amounts)
          const date = new Date(transaction.date);
          const monthKey = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = 0;
          }
          monthlyData[monthKey] += Math.abs(transaction.amount);
        }
      });

      // Convert to array format expected by frontend
      const monthlySpending = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12) // Last 12 months
        .map(([month, amount]) => ({
          month,
          amount: Math.round(amount),
        }));

      console.log("📊 Processed monthly spending:", {
        monthsCount: monthlySpending.length,
        data: monthlySpending,
      });

      return monthlySpending;
    } catch (error) {
      console.error("❌ Error in getMonthlySpending:", error);
      throw error;
    }
  }

  static async getNetWorthData(clerkId) {
    try {
      console.log("💰 DashboardAnalytics.getNetWorthData called");

      const [assets, liabilities] = await Promise.all([
        DataService.getAssets(clerkId),
        DataService.getLiabilities(clerkId),
      ]);

      console.log("📊 Net worth calculation data:", {
        assetsCount: assets.length,
        liabilitiesCount: liabilities.length,
      });

      const totalAssets = assets.reduce(
        (sum, asset) => sum + asset.currentValue,
        0
      );
      const totalLiabilities = liabilities.reduce(
        (sum, liability) => sum + liability.currentBalance,
        0
      );

      // Generate historical data (this should ideally come from historical records)
      const months = [];
      const currentDate = new Date();

      for (let i = 11; i >= 0; i--) {
        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - i,
          1
        );
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        // For demo purposes, we'll simulate some variation
        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation

        months.push({
          month: monthKey,
          assets: Math.round(totalAssets * (1 + variation)),
          liabilities: Math.round(totalLiabilities * (1 + variation * 0.5)),
          netWorth: Math.round(
            (totalAssets - totalLiabilities) * (1 + variation)
          ),
        });
      }

      console.log("📈 Net worth data generated:", {
        monthsCount: months.length,
        currentNetWorth: totalAssets - totalLiabilities,
        sample: months.slice(-3),
      });

      return months;
    } catch (error) {
      console.error("❌ Error in getNetWorthData:", error);
      throw error;
    }
  }

  static async getSpendingCategories(clerkId) {
    try {
      console.log("🏷️ DashboardAnalytics.getSpendingCategories called");

      const transactions = await DataService.getTransactions(clerkId);
      console.log("💳 Transactions for category analysis:", {
        totalTransactions: transactions.length,
      });

      const categories = {};

      transactions.forEach((transaction) => {
        if (transaction.amount < 0) {
          // Only expenses
          const category = transaction.category || "Other";
          if (!categories[category]) {
            categories[category] = 0;
          }
          categories[category] += Math.abs(transaction.amount);
        }
      });

      const spendingCategories = Object.entries(categories)
        .map(([category, amount]) => ({
          category,
          amount: Math.round(amount),
          percentage: 0, // Will be calculated below
        }))
        .sort((a, b) => b.amount - a.amount);

      // Calculate percentages
      const totalSpending = spendingCategories.reduce(
        (sum, cat) => sum + cat.amount,
        0
      );
      spendingCategories.forEach((cat) => {
        cat.percentage = Math.round((cat.amount / totalSpending) * 100);
      });

      console.log("🏷️ Processed spending categories:", {
        categoriesCount: spendingCategories.length,
        totalSpending,
        topCategories: spendingCategories.slice(0, 5),
      });

      return spendingCategories;
    } catch (error) {
      console.error("❌ Error in getSpendingCategories:", error);
      throw error;
    }
  }
}
