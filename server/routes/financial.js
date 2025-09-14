import express from "express";
import { handleAsync } from "../middleware/errorHandler.js";
import { ensureAuth } from "../middleware/clerkAuth.js";
import {
  Asset,
  Liability,
  Transaction,
  EPF,
  CreditScore,
  Investment,
} from "../models/Financial.js";

const router = express.Router();

// Apply authentication middleware to all financial routes
router.use(ensureAuth);

// Assets Management
router.post(
  "/assets",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const { bank_accounts, real_estate, vehicles } = req.body;

    // Calculate total value
    const total_value = [
      ...(bank_accounts || []),
      ...(real_estate || []),
      ...(vehicles || []),
    ].reduce((sum, item) => sum + (item.balance || item.current_value || 0), 0);

    const assetData = {
      user_id: clerkId,
      clerkId,
      total_value,
      bank_accounts: bank_accounts || [],
      real_estate: real_estate || [],
      vehicles: vehicles || [],
    };

    // Upsert (update if exists, create if not)
    const result = await Asset.findOneAndUpdate({ clerkId }, assetData, {
      upsert: true,
      new: true,
    });

    res.json({
      status: "success",
      message: "Assets updated successfully",
      data: result,
      timestamp: new Date().toISOString(),
    });
  })
);

// Liabilities Management
router.post(
  "/liabilities",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const { liabilities } = req.body;

    const liabilityData = {
      user_id: clerkId,
      clerkId,
      liabilities: liabilities || [],
    };

    const result = await Liability.findOneAndUpdate(
      { clerkId },
      liabilityData,
      { upsert: true, new: true }
    );

    res.json({
      status: "success",
      message: "Liabilities updated successfully",
      data: result,
      timestamp: new Date().toISOString(),
    });
  })
);

// Transactions Management
router.post(
  "/transactions",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const { transactions } = req.body;

    const transactionData = {
      user_id: clerkId,
      clerkId,
      transactions: transactions || [],
    };

    const result = await Transaction.findOneAndUpdate(
      { clerkId },
      transactionData,
      { upsert: true, new: true }
    );

    res.json({
      status: "success",
      message: "Transactions updated successfully",
      data: result,
      count: transactions?.length || 0,
      timestamp: new Date().toISOString(),
    });
  })
);

// Add single transaction
router.post(
  "/transactions/add",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const transactionItem = {
      ...req.body,
      id: `t_${Date.now()}`,
      created_at: new Date(),
    };

    let transactionDoc = await Transaction.findOne({ clerkId });

    if (!transactionDoc) {
      transactionDoc = new Transaction({
        user_id: clerkId,
        clerkId,
        transactions: [transactionItem],
      });
    } else {
      transactionDoc.transactions.push(transactionItem);
    }

    await transactionDoc.save();

    res.json({
      status: "success",
      message: "Transaction added successfully",
      data: transactionItem,
      timestamp: new Date().toISOString(),
    });
  })
);

// EPF Management
router.post(
  "/epf",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const epfData = {
      user_id: clerkId,
      clerkId,
      ...req.body,
    };

    const result = await EPF.findOneAndUpdate({ clerkId }, epfData, {
      upsert: true,
      new: true,
    });

    res.json({
      status: "success",
      message: "EPF data updated successfully",
      data: result,
      timestamp: new Date().toISOString(),
    });
  })
);

// Credit Score Management
router.post(
  "/credit-score",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const creditData = {
      user_id: clerkId,
      clerkId,
      ...req.body,
      score_date: new Date(),
    };

    const result = await CreditScore.findOneAndUpdate({ clerkId }, creditData, {
      upsert: true,
      new: true,
    });

    res.json({
      status: "success",
      message: "Credit score updated successfully",
      data: result,
      timestamp: new Date().toISOString(),
    });
  })
);

// Investments Management
router.post(
  "/investments",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const { portfolio } = req.body;

    // Calculate total portfolio value
    const total_value = [
      ...(portfolio?.stocks || []),
      ...(portfolio?.mutual_funds || []),
    ].reduce((sum, item) => sum + (item.current_value || 0), 0);

    const investmentData = {
      user_id: clerkId,
      clerkId,
      portfolio: {
        ...portfolio,
        total_value,
      },
    };

    const result = await Investment.findOneAndUpdate(
      { clerkId },
      investmentData,
      { upsert: true, new: true }
    );

    res.json({
      status: "success",
      message: "Investments updated successfully",
      data: result,
      timestamp: new Date().toISOString(),
    });
  })
);

// Bulk financial data import
router.post(
  "/import",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;
    const { assets, liabilities, transactions, epf, creditScore, investments } =
      req.body;

    const results = {};

    // Import assets
    if (assets) {
      const total_value = [
        ...(assets.bank_accounts || []),
        ...(assets.real_estate || []),
        ...(assets.vehicles || []),
      ].reduce(
        (sum, item) => sum + (item.balance || item.current_value || 0),
        0
      );

      results.assets = await Asset.findOneAndUpdate(
        { clerkId },
        { user_id: clerkId, clerkId, total_value, ...assets },
        { upsert: true, new: true }
      );
    }

    // Import liabilities
    if (liabilities) {
      results.liabilities = await Liability.findOneAndUpdate(
        { clerkId },
        { user_id: clerkId, clerkId, ...liabilities },
        { upsert: true, new: true }
      );
    }

    // Import transactions
    if (transactions) {
      results.transactions = await Transaction.findOneAndUpdate(
        { clerkId },
        { user_id: clerkId, clerkId, ...transactions },
        { upsert: true, new: true }
      );
    }

    // Import EPF
    if (epf) {
      results.epf = await EPF.findOneAndUpdate(
        { clerkId },
        { user_id: clerkId, clerkId, ...epf },
        { upsert: true, new: true }
      );
    }

    // Import credit score
    if (creditScore) {
      results.creditScore = await CreditScore.findOneAndUpdate(
        { clerkId },
        { user_id: clerkId, clerkId, ...creditScore, score_date: new Date() },
        { upsert: true, new: true }
      );
    }

    // Import investments
    if (investments) {
      const total_value = [
        ...(investments.portfolio?.stocks || []),
        ...(investments.portfolio?.mutual_funds || []),
      ].reduce((sum, item) => sum + (item.current_value || 0), 0);

      results.investments = await Investment.findOneAndUpdate(
        { clerkId },
        {
          user_id: clerkId,
          clerkId,
          portfolio: { ...investments.portfolio, total_value },
        },
        { upsert: true, new: true }
      );
    }

    res.json({
      status: "success",
      message: "Financial data imported successfully",
      data: results,
      imported: Object.keys(results),
      timestamp: new Date().toISOString(),
    });
  })
);

// Delete user's financial data
router.delete(
  "/clear",
  handleAsync(async (req, res) => {
    const clerkId = req.auth.userId;

    const deletionResults = await Promise.allSettled([
      Asset.deleteMany({ clerkId }),
      Liability.deleteMany({ clerkId }),
      Transaction.deleteMany({ clerkId }),
      EPF.deleteMany({ clerkId }),
      CreditScore.deleteMany({ clerkId }),
      Investment.deleteMany({ clerkId }),
    ]);

    res.json({
      status: "success",
      message: "All financial data cleared successfully",
      deletionResults: deletionResults.map((result) => ({
        status: result.status,
        deletedCount: result.value?.deletedCount || 0,
      })),
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
