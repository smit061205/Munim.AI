import { v4 as uuidv4 } from "uuid";
import { Transaction } from "../models/Financial.js";
import { CategoryRule } from "../models/Planning.js";
import { ApiError } from "../middleware/errorHandler.js";
import {
  categorize,
  ruleCategory,
  ruleMatchFor,
  UNSORTED,
} from "../services/categorizeService.js";

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Get all transactions for a user
export const getTransactions = handle(async (req, res) => {
  const doc = await Transaction.findOne({ user_id: req.auth.userId }).lean();
  res.json({ success: true, data: doc?.transactions || [] });
});

// Create a new transaction. A missing category is filled in by the user's
// rules, known merchants or AI.
export const createTransaction = handle(async (req, res) => {
  const userId = req.auth.userId;
  const { date, amount, type, category, description, account } = req.body;

  if (!DATE.test(date || "") || !["income", "expense"].includes(type)) {
    throw new ApiError(400, "Enter a date, an amount and whether it's money in or out");
  }
  const parsedAmount = parseFloat(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount === 0) {
    throw new ApiError(400, "Amount must be a valid non-zero number");
  }

  const transaction = {
    id: uuidv4(),
    date,
    amount: type === "expense" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
    type,
    category: String(category || "").trim().slice(0, 60) || UNSORTED,
    category_source: category ? "user" : undefined,
    description: String(description || "").trim().slice(0, 200),
    account: String(account || "").trim().slice(0, 80),
    created_at: new Date(),
  };

  const doc =
    (await Transaction.findOne({ user_id: userId })) ||
    new Transaction({ user_id: userId, transactions: [] });
  if (!category) await categorize(userId, [transaction], doc.transactions);

  doc.transactions.push(transaction);
  await doc.save();
  res.status(201).json({ success: true, data: transaction });
});

// Re-sorts transactions matching a rule, leaving ones the user chose alone
const applyRule = (doc, rule) => {
  let changed = 0;
  for (const transaction of doc.transactions) {
    if (transaction.category_source === "user") continue;
    if (ruleCategory([rule], transaction) && transaction.category !== rule.category) {
      transaction.category = rule.category;
      transaction.category_source = "rule";
      changed += 1;
    }
  }
  return changed;
};

// Update a transaction. With `remember`, the new category becomes a rule for
// this merchant and is applied to its other transactions.
export const updateTransaction = handle(async (req, res) => {
  const userId = req.auth.userId;
  const { date, amount, type, category, description, account, remember } = req.body;

  const doc = await Transaction.findOne({ user_id: userId });
  const transaction = doc?.transactions.find((row) => row.id === req.params.transactionId);
  if (!transaction) throw new ApiError(404, "Transaction not found");

  if (date) {
    if (!DATE.test(date)) throw new ApiError(400, "Enter a valid date");
    transaction.date = date;
  }
  if (type) {
    if (!["income", "expense"].includes(type)) throw new ApiError(400, "Choose money in or out");
    transaction.type = type;
  }
  if (amount !== undefined) {
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount)) throw new ApiError(400, "Enter a valid amount");
    transaction.amount =
      transaction.type === "expense" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
  }
  if (category) {
    transaction.category = String(category).trim().slice(0, 60);
    transaction.category_source = "user";
  }
  if (description !== undefined) transaction.description = String(description).trim().slice(0, 200);
  if (account !== undefined) transaction.account = String(account).trim().slice(0, 80);

  let rule = null;
  let applied = 0;
  if (remember && category) {
    const match = ruleMatchFor(transaction);
    if (match && match !== "other") {
      rule = await CategoryRule.findOneAndUpdate(
        { user_id: userId, match },
        { user_id: userId, match, category: transaction.category },
        { upsert: true, new: true },
      );
      applied = applyRule(doc, rule);
    }
  }

  await doc.save();
  res.json({ success: true, data: transaction, rule, applied });
});

export const deleteTransaction = handle(async (req, res) => {
  const doc = await Transaction.findOne({ user_id: req.auth.userId });
  const index = doc?.transactions.findIndex((row) => row.id === req.params.transactionId) ?? -1;
  if (index === -1) throw new ApiError(404, "Transaction not found");
  doc.transactions.splice(index, 1);
  await doc.save();
  res.json({ success: true });
});

// Categorisation rules
export const listRules = handle(async (req, res) => {
  const rules = await CategoryRule.find({ user_id: req.auth.userId }).sort({ match: 1 }).lean();
  res.json({ success: true, data: rules });
});

export const createRule = handle(async (req, res) => {
  const userId = req.auth.userId;
  const match = String(req.body.match || "").trim().toLowerCase().slice(0, 80);
  const category = String(req.body.category || "").trim().slice(0, 60);
  if (match.length < 2) throw new ApiError(400, "Enter at least two characters to match");
  if (!category) throw new ApiError(400, "Choose a category");

  const rule = await CategoryRule.findOneAndUpdate(
    { user_id: userId, match },
    { user_id: userId, match, category },
    { upsert: true, new: true },
  );

  let applied = 0;
  if (req.body.apply !== false) {
    const doc = await Transaction.findOne({ user_id: userId });
    if (doc) {
      applied = applyRule(doc, rule);
      if (applied) await doc.save();
    }
  }
  res.status(201).json({ success: true, data: rule, applied });
});

export const deleteRule = handle(async (req, res) => {
  await CategoryRule.deleteOne({ _id: req.params.id, user_id: req.auth.userId });
  res.json({ success: true });
});

// Sorts every uncategorised transaction again, for after rules change or AI
// becomes available
export const recategorize = handle(async (req, res) => {
  const doc = await Transaction.findOne({ user_id: req.auth.userId });
  if (!doc) return res.json({ success: true, data: { rule: 0, keyword: 0, ai: 0 } });
  const unsorted = doc.transactions.filter((row) => row.category === UNSORTED);
  const counts = await categorize(req.auth.userId, unsorted, doc.transactions);
  await doc.save();
  res.json({ success: true, data: counts, remaining: unsorted.filter((row) => row.category === UNSORTED).length });
});
