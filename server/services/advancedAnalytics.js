import { DataService } from "./dataService.js";

export class AdvancedAnalytics {
  async getExpenseTrends(allowedCategories = []) {
    if (!allowedCategories.includes("transactions")) {
      return {
        success: false,
        message: "Transactions category not allowed",
        data: {
          labels: [],
          datasets: [],
          forecast: [],
          confidence: [],
        },
        metadata: {
          chartType: "line",
          title: "Expense Trends & Forecast",
          xAxisLabel: "Month",
          yAxisLabel: "Amount (₹)",
        },
      };
    }

    // Mock expense trends data with forecasting
    const mockData = {
      success: true,
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
        datasets: [
          {
            label: "Actual Expenses",
            data: [45000, 52000, 48000, 55000, 51000, 58000, null, null, null],
            borderColor: "#e74c3c",
            backgroundColor: "rgba(231, 76, 60, 0.1)",
            tension: 0.4,
          },
          {
            label: "Forecasted Expenses",
            data: [null, null, null, null, null, 58000, 61000, 59000, 63000],
            borderColor: "#3498db",
            backgroundColor: "rgba(52, 152, 219, 0.1)",
            borderDash: [5, 5],
            tension: 0.4,
          },
        ],
        forecast: {
          july: { amount: 61000, confidence: 85 },
          august: { amount: 59000, confidence: 78 },
          september: { amount: 63000, confidence: 72 },
        },
        trends: {
          monthlyGrowth: 4.2,
          averageExpense: 51500,
          volatility: "moderate",
        },
      },
      metadata: {
        chartType: "line",
        title: "Expense Trends & 3-Month Forecast",
        xAxisLabel: "Month",
        yAxisLabel: "Amount (₹)",
        showLegend: true,
        forecastAccuracy: "Based on 6-month historical data",
      },
    };

    return mockData;
  }

  async getSavingsForecast(allowedCategories = []) {
    if (!allowedCategories.includes("transactions")) {
      return {
        success: false,
        message: "Transactions category not allowed",
        data: { labels: [], datasets: [] },
      };
    }

    const mockData = {
      success: true,
      data: {
        labels: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        datasets: [
          {
            label: "Income",
            data: [
              85000, 85000, 90000, 85000, 95000, 88000, 90000, 92000, 88000,
              90000, 95000, 100000,
            ],
            borderColor: "#27ae60",
            backgroundColor: "rgba(39, 174, 96, 0.1)",
          },
          {
            label: "Expenses",
            data: [
              45000, 52000, 48000, 55000, 51000, 58000, 61000, 59000, 63000,
              57000, 62000, 65000,
            ],
            borderColor: "#e74c3c",
            backgroundColor: "rgba(231, 76, 60, 0.1)",
          },
          {
            label: "Projected Savings",
            data: [
              40000, 33000, 42000, 30000, 44000, 30000, 29000, 33000, 25000,
              33000, 33000, 35000,
            ],
            borderColor: "#f39c12",
            backgroundColor: "rgba(243, 156, 18, 0.1)",
          },
        ],
        savingsRate: {
          current: 34.1,
          projected: 31.8,
          target: 40.0,
        },
        yearEndProjection: {
          totalSavings: 387000,
          monthlyAverage: 32250,
        },
      },
      metadata: {
        chartType: "line",
        title: "Income vs Expenses & Savings Forecast",
        xAxisLabel: "Month",
        yAxisLabel: "Amount (₹)",
        showLegend: true,
      },
    };

    return mockData;
  }

  async getInvestmentComposition(allowedCategories = []) {
    if (!allowedCategories.includes("investments")) {
      return {
        success: false,
        message: "Investments category not allowed",
        data: { labels: [], datasets: [] },
      };
    }

    const mockData = {
      success: true,
      data: {
        labels: [
          "Equity Mutual Funds",
          "Debt Funds",
          "Direct Stocks",
          "PPF",
          "Gold ETF",
          "Real Estate",
        ],
        datasets: [
          {
            data: [45, 20, 15, 10, 5, 5],
            backgroundColor: [
              "#3498db",
              "#2ecc71",
              "#e74c3c",
              "#f39c12",
              "#9b59b6",
              "#1abc9c",
            ],
            borderWidth: 2,
          },
        ],
        riskAnalysis: {
          portfolioRisk: "Moderate-High",
          diversificationScore: 78,
          recommendedRebalancing: "Increase debt allocation by 5%",
        },
        performance: {
          ytdReturn: 12.4,
          expectedReturn: 14.2,
          volatility: 16.8,
        },
      },
      metadata: {
        chartType: "doughnut",
        title: "Investment Portfolio Composition",
        showLegend: true,
        centerText: "₹12.5L Total",
      },
    };

    return mockData;
  }

  async getFinancialHealthScore(allowedCategories = []) {
    const hasTransactions = allowedCategories.includes("transactions");
    const hasAssets = allowedCategories.includes("assets");
    const hasLiabilities = allowedCategories.includes("liabilities");
    const hasInvestments = allowedCategories.includes("investments");

    const mockData = {
      success: true,
      data: {
        overallScore: hasTransactions && hasAssets && hasLiabilities ? 78 : 45,
        categories: {
          cashFlow: hasTransactions ? 82 : 0,
          debtRatio: hasLiabilities ? 75 : 0,
          savingsRate: hasTransactions ? 85 : 0,
          investmentDiversity: hasInvestments ? 70 : 0,
          emergencyFund: hasAssets ? 80 : 0,
        },
        recommendations: [
          hasTransactions
            ? "Maintain current savings rate"
            : "Enable transactions tracking",
          hasLiabilities
            ? "Consider debt consolidation"
            : "Enable liabilities tracking",
          hasInvestments
            ? "Diversify portfolio further"
            : "Enable investments tracking",
        ],
        trends: {
          lastMonth: hasTransactions ? 76 : 40,
          improvement: hasTransactions ? "+2 points" : "Enable tracking",
        },
      },
      metadata: {
        chartType: "radar",
        title: "Financial Health Score",
        maxScore: 100,
      },
    };

    return mockData;
  }

  async getCashFlowAnalysis(allowedCategories = []) {
    if (!allowedCategories.includes("transactions")) {
      return {
        success: false,
        message: "Transactions category not allowed",
        data: { labels: [], datasets: [] },
      };
    }

    const mockData = {
      success: true,
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Cash Inflow",
            data: [85000, 85000, 90000, 85000, 95000, 88000],
            backgroundColor: "rgba(39, 174, 96, 0.8)",
          },
          {
            label: "Cash Outflow",
            data: [-45000, -52000, -48000, -55000, -51000, -58000],
            backgroundColor: "rgba(231, 76, 60, 0.8)",
          },
        ],
        netCashFlow: {
          current: 30000,
          average: 36500,
          trend: "stable",
        },
        breakdown: {
          inflow: {
            salary: 75000,
            freelance: 10000,
            investments: 3000,
          },
          outflow: {
            essentials: 35000,
            lifestyle: 15000,
            investments: 8000,
          },
        },
      },
      metadata: {
        chartType: "bar",
        title: "Monthly Cash Flow Analysis",
        xAxisLabel: "Month",
        yAxisLabel: "Amount (₹)",
      },
    };

    return mockData;
  }

  async getAnalyticsSummary(allowedCategories = []) {
    const hasTransactions = allowedCategories.includes("transactions");
    const hasAssets = allowedCategories.includes("assets");
    const hasLiabilities = allowedCategories.includes("liabilities");
    const hasInvestments = allowedCategories.includes("investments");

    const mockData = {
      success: true,
      data: {
        keyMetrics: {
          monthlyExpenseGrowth: hasTransactions ? 4.2 : null,
          savingsRate: hasTransactions ? 34.1 : null,
          investmentReturn: hasInvestments ? 12.4 : null,
          debtToIncomeRatio: hasLiabilities ? 0.23 : null,
          financialHealthScore: 78,
        },
        insights: [
          hasTransactions
            ? "Expense growth trending upward - consider budget review"
            : "Enable transaction tracking for expense insights",
          hasInvestments
            ? "Portfolio performing above market average"
            : "Enable investment tracking for portfolio insights",
          hasLiabilities
            ? "Debt ratio within healthy range"
            : "Enable liability tracking for debt insights",
        ],
        forecasts: {
          nextMonthExpense: hasTransactions ? 61000 : null,
          yearEndSavings: hasTransactions ? 387000 : null,
          portfolioProjection: hasInvestments ? "14.2% expected return" : null,
        },
        alerts: [
          hasTransactions && "Monthly expenses increased by 12% this quarter",
          hasLiabilities && "Credit utilization above 70%",
          !hasInvestments && "No investment tracking enabled",
        ].filter(Boolean),
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataCompleteness: Math.round((allowedCategories.length / 6) * 100),
      },
    };

    return mockData;
  }

  async filterByCategories(allowedCategories = []) {
    // This method handles dynamic category filtering
    const results = {};

    if (allowedCategories.includes("transactions")) {
      results.expenseTrends = await this.getExpenseTrends(allowedCategories);
      results.savingsForecast = await this.getSavingsForecast(
        allowedCategories
      );
      results.cashFlow = await this.getCashFlowAnalysis(allowedCategories);
    }

    if (allowedCategories.includes("investments")) {
      results.investmentComposition = await this.getInvestmentComposition(
        allowedCategories
      );
    }

    results.financialHealth = await this.getFinancialHealthScore(
      allowedCategories
    );
    results.summary = await this.getAnalyticsSummary(allowedCategories);

    return {
      success: true,
      data: results,
      metadata: {
        filteredCategories: allowedCategories,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
