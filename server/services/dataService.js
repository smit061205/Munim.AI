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
      creditScore: CreditScore, // Support both naming conventions
      investments: Investment,
    };
    return modelMap[category];
  }

  // Load data for a specific user and category from MongoDB
  static async loadData(category, userId) {
    try {
      console.log(
        `🔍 DataService.loadData called for category: ${category}, userId: ${userId}`
      );

      const Model = this.getModelByCategory(category);
      if (!Model) {
        console.error(`❌ Invalid category: ${category}`);
        throw new Error(`Invalid category: ${category}`);
      }

      console.log(
        `🔎 Querying MongoDB with filter: { clerkId: "${userId}" } for model: ${Model.modelName}`
      );
      const data = await Model.findOne({ clerkId: userId });

      if (data) {
        console.log(`✅ Found data for ${category}:`, {
          hasData: true,
          dataKeys: Object.keys(data.toObject()),
          sampleData:
            category === "transactions"
              ? `${data.transactions?.length || 0} transactions`
              : `${JSON.stringify(data).substring(0, 100)}...`,
        });
      } else {
        console.log(`⚠️ No data found for ${category} with clerkId: ${userId}`);
      }

      return data || null;
    } catch (error) {
      console.error(
        `❌ Error loading ${category} data for userId ${userId}:`,
        error
      );
      throw error;
    }
  }

  // Load data for allowed categories
  static async loadAllowedData(userId, allowedCategories) {
    try {
      console.log(
        `🔍 DataService.loadAllowedData called for userId: ${userId}`
      );
      console.log(`📋 Allowed categories: [${allowedCategories.join(", ")}]`);

      const result = {};

      for (const category of allowedCategories) {
        console.log(`🔄 Processing category: ${category}`);
        const data = await this.loadData(category, userId);
        if (data) {
          result[category] = data;
          console.log(`✅ Added ${category} data to result`);
        } else {
          console.log(`⚠️ No data found for category: ${category}`);
        }
      }

      console.log(`📊 Final result summary:`, {
        totalCategories: allowedCategories.length,
        categoriesWithData: Object.keys(result).length,
        categoriesWithData_list: Object.keys(result),
        categoriesWithoutData: allowedCategories.filter((cat) => !result[cat]),
      });

      return result;
    } catch (error) {
      console.error(
        `❌ Error loading allowed data for userId ${userId}:`,
        error
      );
      throw error;
    }
  }

  // Get user data for a specific category (public interface)
  static async getUserData(category, userId) {
    try {
      console.log(
        `📊 DataService.getUserData called for category: ${category}, userId: ${userId}`
      );

      const data = await this.loadData(category, userId);

      if (!data) {
        console.log(`❌ No data found for category: ${category}`);
        return [];
      }

      // For transactions, return the transactions array directly
      if (category === "transactions") {
        return data.transactions || [];
      }

      // For other categories, return the data as is
      return data;
    } catch (error) {
      console.error(
        `❌ Error in DataService.getUserData for category ${category}:`,
        error
      );
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

  // Load all user data from all categories
  static async loadAllUserData(userId) {
    console.log(`📋 DataService.loadAllUserData called for userId: ${userId}`);

    const categories = [
      "assets",
      "liabilities",
      "transactions",
      "epf",
      "creditScore",
      "investments",
    ];

    const result = {};
    const categoriesWithData = [];
    const categoriesWithoutData = [];
    const deniedCategories = [];

    console.log(`🔄 Processing ${categories.length} categories...`);

    for (const category of categories) {
      try {
        console.log(`🔄 Processing category: ${category}`);

        // Check permissions first
        const hasPermission = await this.hasPermission(userId, category);
        if (!hasPermission) {
          console.log(`🔐 Permission denied for category: ${category}`);
          deniedCategories.push(category);
          continue;
        }

        const data = await this.loadData(category, userId, true); // Skip permission check since we already checked

        if (data) {
          result[category] = data;
          categoriesWithData.push(category);
          console.log(`✅ Added ${category} data to result`);
        } else {
          categoriesWithoutData.push(category);
          console.log(`❌ No data found for ${category}`);
        }
      } catch (error) {
        console.error(`❌ Error loading ${category}:`, error);
        categoriesWithoutData.push(category);
      }
    }

    console.log(`📊 Final result summary:`, {
      totalCategories: categories.length,
      categoriesWithData: categoriesWithData.length,
      categoriesWithData_list: categoriesWithData,
      categoriesWithoutData: categoriesWithoutData,
      deniedCategories: deniedCategories,
    });

    console.log(`📋 Data loading complete:`, {
      hasData: Object.keys(result).length > 0,
      categoriesFound: Object.keys(result),
      totalCategories: Object.keys(result).length,
      deniedCategories: deniedCategories,
    });

    return {
      data: result,
      permissions: {
        allowed: categoriesWithData,
        denied: deniedCategories,
        noData: categoriesWithoutData,
      },
    };
  }

  // Specific data access methods for DashboardAnalytics
  static async getAssets(clerkId) {
    console.log("🏦 DataService.getAssets called");
    const data = await this.getUserData("assets", clerkId);

    // Handle case where data might be a single document or null
    if (!data) {
      console.log("⚠️ No assets data found");
      return [];
    }

    // Convert single document to array for processing
    const assetsArray = Array.isArray(data) ? data : [data];

    const processedAssets = [
      ...assetsArray.flatMap(
        (doc) =>
          doc.bank_accounts?.map((acc) => ({
            currentValue: acc.balance, // Fix: use 'balance' from JSON
            type: acc.type,
            name: acc.bank_name,
          })) || []
      ),
      ...assetsArray.flatMap(
        (doc) =>
          doc.real_estate?.map((re) => ({
            currentValue: re.current_value, // This is correct
            type: re.type,
          })) || []
      ),
      ...assetsArray.flatMap(
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
    const processedTransactions = data;

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

    // Handle case where data might be a single document or null
    if (!data) {
      console.log("⚠️ No investments data found");
      return [];
    }

    // Convert single document to array for processing
    const investmentsArray = Array.isArray(data) ? data : [data];

    const processedInvestments = investmentsArray.flatMap((doc) => [
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
