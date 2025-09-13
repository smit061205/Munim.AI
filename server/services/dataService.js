import {
  Asset,
  Liability,
  Transaction,
  EPF,
  CreditScore,
  Investment,
} from "../models/Financial.js";

class DataService {
  // Helper method to get model by category
  static getModelByCategory(category) {
    const modelMap = {
      assets: Asset,
      liabilities: Liability,
      transactions: Transaction,
      epf: EPF,
      "credit-score": CreditScore,
      investments: Investment,
    };
    return modelMap[category];
  }

  // Load data for a specific user and category from MongoDB
  static async loadData(category, userId) {
    try {
      const Model = this.getModelByCategory(category);
      if (!Model) {
        throw new Error(`Invalid category: ${category}`);
      }

      const data = await Model.findOne({ user_id: userId });
      return data || null;
    } catch (error) {
      console.error(`Error loading ${category} data:`, error);
      throw error;
    }
  }

  // Load data for allowed categories
  static async loadAllowedData(userId, allowedCategories) {
    try {
      const result = {};

      for (const category of allowedCategories) {
        const data = await this.loadData(category, userId);
        if (data) {
          result[category] = data;
        }
      }

      return result;
    } catch (error) {
      console.error("Error loading allowed data:", error);
      throw error;
    }
  }

  // Get user-specific data for a category
  static async getUserData(category, clerkId) {
    try {
      console.log(
        `🔍 DataService.getUserData called for category: ${category}, user: ${clerkId}`
      );
      const Model = this.getModelByCategory(category);
      if (!Model) {
        throw new Error(`Invalid category: ${category}`);
      }

      const data = await Model.find({ clerkId: clerkId });
      console.log(
        `📊 MongoDB query result for ${category} (user: ${clerkId}):`,
        {
          count: data.length,
          sample: data.length > 0 ? data[0] : null,
        }
      );
      return data;
    } catch (error) {
      console.error(`❌ Error getting user ${category} data:`, error);
      throw error;
    }
  }

  // Get all data for a specific category
  static async getAllData(category) {
    try {
      console.log(`🔍 DataService.getAllData called for category: ${category}`);
      const Model = this.getModelByCategory(category);
      if (!Model) {
        throw new Error(`Invalid category: ${category}`);
      }

      const data = await Model.find({});
      console.log(`📊 MongoDB query result for ${category}:`, {
        count: data.length,
        sample: data.length > 0 ? data[0] : null,
      });
      return data;
    } catch (error) {
      console.error(`❌ Error getting all ${category} data:`, error);
      throw error;
    }
  }

  // Specific data access methods for DashboardAnalytics
  static async getAssets(clerkId) {
    console.log("🏦 DataService.getAssets called");
    const data = await this.getUserData("assets", clerkId);
    const processedAssets = [
      ...data.flatMap(
        (doc) =>
          doc.bank_accounts?.map((acc) => ({
            currentValue: acc.balance, // Fix: use 'balance' from JSON
            type: acc.type,
            name: acc.bank_name,
          })) || []
      ),
      ...data.flatMap(
        (doc) =>
          doc.real_estate?.map((re) => ({
            currentValue: re.current_value, // This is correct
            type: re.type,
          })) || []
      ),
      ...data.flatMap(
        (doc) =>
          doc.vehicles?.map((v) => ({
            currentValue: v.current_value, // This is correct
            type: v.type,
          })) || []
      ),
    ];

    console.log(`💰 Processed assets:`, {
      totalAssets: processedAssets.length,
      totalValue: processedAssets.reduce(
        (sum, asset) => sum + asset.currentValue,
        0
      ),
      sample: processedAssets[0],
    });
    return processedAssets;
  }

  static async getLiabilities(clerkId) {
    console.log("💳 DataService.getLiabilities called");
    const data = await this.getUserData("liabilities", clerkId);
    const processedLiabilities = data.flatMap(
      (doc) =>
        doc.liabilities?.map((liability) => ({
          currentBalance: liability.remaining_balance,
          type: liability.liability_type,
          monthlyPayment: liability.monthly_installment,
        })) || []
    );

    console.log(`💳 Processed liabilities:`, {
      totalLiabilities: processedLiabilities.length,
      totalValue: processedLiabilities.reduce(
        (sum, liability) => sum + liability.currentBalance,
        0
      ),
      sample: processedLiabilities[0],
    });

    return processedLiabilities;
  }

  static async getTransactions(clerkId) {
    console.log("💸 DataService.getTransactions called");
    const data = await this.getUserData("transactions", clerkId);
    const processedTransactions = data.flatMap((doc) => doc.transactions || []);

    console.log(`📋 Processed transactions:`, {
      totalTransactions: processedTransactions.length,
      sample: processedTransactions.slice(0, 3),
    });
    return processedTransactions;
  }

  static async getEPF(clerkId) {
    console.log("🏛️ DataService.getEPF called");
    const data = await this.getUserData("epf", clerkId);
    const epfData = data[0] || { currentBalance: 0 };

    console.log(`🏛️ EPF data:`, epfData);
    return epfData;
  }

  static async getCreditScore(clerkId) {
    console.log("📊 DataService.getCreditScore called");
    const data = await this.getUserData("credit-score", clerkId);

    // Credit score data is typically a single record per user, so we'll take the first one
    const creditRecord = data[0] || {};

    const processedCreditScore = {
      score: creditRecord.credit_score || 750, // Fix: use credit_score from JSON
      paymentHistory: creditRecord.payment_history || "good",
      creditUtilization: creditRecord.credit_utilization || 30,
    };

    console.log(`📊 Processed credit score:`, {
      score: processedCreditScore.score,
      history: processedCreditScore.paymentHistory,
      utilization: processedCreditScore.creditUtilization,
      sample: processedCreditScore,
    });

    return processedCreditScore;
  }

  static async getInvestments(clerkId) {
    console.log("📈 DataService.getInvestments called");
    const data = await this.getUserData("investments", clerkId);
    const processedInvestments = data.flatMap((doc) => [
      ...(doc.portfolio?.stocks?.map((stock) => ({
        type: "stock",
        symbol: stock.symbol,
        currentValue: stock.current_value, // This is correct
        quantity: stock.quantity,
      })) || []),
      ...(doc.portfolio?.mutual_funds?.map((mf) => ({
        type: "mutual_fund",
        name: mf.scheme_name,
        currentValue: mf.current_value, // This is correct
        units: mf.units,
      })) || []),
    ]);

    console.log(`📈 Processed investments:`, {
      totalInvestments: processedInvestments.length,
      totalValue: processedInvestments.reduce(
        (sum, investment) => sum + investment.currentValue,
        0
      ),
      sample: processedInvestments[0],
    });

    return processedInvestments;
  }
}

export { DataService };
