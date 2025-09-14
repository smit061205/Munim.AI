import { Asset } from "../models/Financial.js";
import { v4 as uuidv4 } from "uuid";

// Get all accounts for a user
export const getAccounts = async (req, res) => {
  try {
    const clerkId = req.auth.userId;

    let assetDoc = await Asset.findOne({ clerkId });

    if (!assetDoc) {
      return res.json({ success: true, data: [] });
    }

    res.json({
      success: true,
      data: assetDoc.bank_accounts || [],
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch accounts",
    });
  }
};

// Create a new account
export const createAccount = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const { type, bank_name, balance, account_number } = req.body;

    // Validate required fields
    if (!type || !bank_name) {
      return res.status(400).json({
        success: false,
        message: "Account type and bank name are required",
      });
    }

    // Validate account type
    const validTypes = ["savings", "current", "checking", "investment"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account type",
      });
    }

    const newAccount = {
      id: uuidv4(),
      type,
      bank_name,
      balance: parseFloat(balance) || 0,
      account_number: account_number || "",
      created_at: new Date(),
    };

    // Find or create asset document
    let assetDoc = await Asset.findOne({ clerkId });

    if (!assetDoc) {
      assetDoc = new Asset({
        user_id: clerkId,
        clerkId,
        total_value: newAccount.balance,
        bank_accounts: [newAccount],
        real_estate: [],
        vehicles: [],
      });
    } else {
      assetDoc.bank_accounts.push(newAccount);
      // Recalculate total value
      assetDoc.total_value = [
        ...assetDoc.bank_accounts,
        ...assetDoc.real_estate,
        ...assetDoc.vehicles,
      ].reduce(
        (sum, item) => sum + (item.balance || item.current_value || 0),
        0
      );
    }

    await assetDoc.save();

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: newAccount,
    });
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create account",
    });
  }
};

// Update an account
export const updateAccount = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const { accountId } = req.params;
    const { type, bank_name, balance, account_number } = req.body;

    const assetDoc = await Asset.findOne({ clerkId });

    if (!assetDoc) {
      return res.status(404).json({
        success: false,
        message: "No accounts found for user",
      });
    }

    const accountIndex = assetDoc.bank_accounts.findIndex(
      (account) => account.id === accountId
    );

    if (accountIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Update account fields
    if (type) assetDoc.bank_accounts[accountIndex].type = type;
    if (bank_name) assetDoc.bank_accounts[accountIndex].bank_name = bank_name;
    if (balance !== undefined)
      assetDoc.bank_accounts[accountIndex].balance = parseFloat(balance);
    if (account_number !== undefined)
      assetDoc.bank_accounts[accountIndex].account_number = account_number;

    // Recalculate total value
    assetDoc.total_value = [
      ...assetDoc.bank_accounts,
      ...assetDoc.real_estate,
      ...assetDoc.vehicles,
    ].reduce((sum, item) => sum + (item.balance || item.current_value || 0), 0);

    await assetDoc.save();

    res.json({
      success: true,
      message: "Account updated successfully",
      data: assetDoc.bank_accounts[accountIndex],
    });
  } catch (error) {
    console.error("Error updating account:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update account",
    });
  }
};

// Delete an account
export const deleteAccount = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const { accountId } = req.params;

    const assetDoc = await Asset.findOne({ clerkId });

    if (!assetDoc) {
      return res.status(404).json({
        success: false,
        message: "No accounts found for user",
      });
    }

    const accountIndex = assetDoc.bank_accounts.findIndex(
      (account) => account.id === accountId
    );

    if (accountIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Remove the account
    assetDoc.bank_accounts.splice(accountIndex, 1);

    // Recalculate total value
    assetDoc.total_value = [
      ...assetDoc.bank_accounts,
      ...assetDoc.real_estate,
      ...assetDoc.vehicles,
    ].reduce((sum, item) => sum + (item.balance || item.current_value || 0), 0);

    await assetDoc.save();

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
};
