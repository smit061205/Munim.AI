import { Transaction } from "../models/Financial.js";
import { v4 as uuidv4 } from "uuid";

// Get all transactions for a user
export const getTransactions = async (req, res) => {
  try {
    const clerkId = req.auth.userId;

    let transactionDoc = await Transaction.findOne({ clerkId });

    if (!transactionDoc) {
      return res.json({ success: true, data: [] });
    }

    res.json({
      success: true,
      data: transactionDoc.transactions || [],
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
    });
  }
};

// Create a new transaction
export const createTransaction = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const { date, amount, type, category, description, account } = req.body;

    // Validate required fields
    if (!date || !amount || !type || !category) {
      return res.status(400).json({
        success: false,
        message: "Date, amount, type, and category are required",
      });
    }

    // Validate transaction type
    const validTypes = ["income", "expense"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type. Must be 'income' or 'expense'",
      });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid non-zero number",
      });
    }

    const newTransaction = {
      id: uuidv4(),
      date,
      amount:
        type === "expense" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
      type,
      category,
      description: description || "",
      account: account || "",
      created_at: new Date(),
    };

    // Find or create transaction document
    let transactionDoc = await Transaction.findOne({ clerkId });

    if (!transactionDoc) {
      transactionDoc = new Transaction({
        user_id: clerkId,
        clerkId,
        transactions: [newTransaction],
      });
    } else {
      transactionDoc.transactions.push(newTransaction);
    }

    await transactionDoc.save();

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: newTransaction,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create transaction",
    });
  }
};

// Update a transaction
export const updateTransaction = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const { transactionId } = req.params;
    const { date, amount, type, category, description, account } = req.body;

    const transactionDoc = await Transaction.findOne({ clerkId });

    if (!transactionDoc) {
      return res.status(404).json({
        success: false,
        message: "No transactions found for user",
      });
    }

    const transactionIndex = transactionDoc.transactions.findIndex(
      (transaction) => transaction.id === transactionId
    );

    if (transactionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Update transaction fields
    if (date) transactionDoc.transactions[transactionIndex].date = date;
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (!isNaN(parsedAmount)) {
        transactionDoc.transactions[transactionIndex].amount =
          type === "expense" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
      }
    }
    if (type) transactionDoc.transactions[transactionIndex].type = type;
    if (category)
      transactionDoc.transactions[transactionIndex].category = category;
    if (description !== undefined)
      transactionDoc.transactions[transactionIndex].description = description;
    if (account !== undefined)
      transactionDoc.transactions[transactionIndex].account = account;

    await transactionDoc.save();

    res.json({
      success: true,
      message: "Transaction updated successfully",
      data: transactionDoc.transactions[transactionIndex],
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update transaction",
    });
  }
};

// Delete a transaction
export const deleteTransaction = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const { transactionId } = req.params;

    const transactionDoc = await Transaction.findOne({ clerkId });

    if (!transactionDoc) {
      return res.status(404).json({
        success: false,
        message: "No transactions found for user",
      });
    }

    const transactionIndex = transactionDoc.transactions.findIndex(
      (transaction) => transaction.id === transactionId
    );

    if (transactionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Remove the transaction
    transactionDoc.transactions.splice(transactionIndex, 1);
    await transactionDoc.save();

    res.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete transaction",
    });
  }
};
