import { randomUUID as uuidv4 } from "node:crypto";
import { Transaction } from "../models/Financial.js";
import { Budget } from "../models/Financial.js";
import { CategoryRule } from "../models/Planning.js";
import { notify } from "../services/notificationService.js";
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

const cleanTags = (tags) =>
  Array.isArray(tags)
    ? [...new Set(tags.map((tag) => String(tag).trim().toLowerCase().replace(/\s+/g, "-").slice(0, 30)).filter(Boolean))].slice(0, 8)
    : undefined;

// Says so straight away when a new expense takes a monthly budget past its limit
const checkBudget = async (userId, doc, transaction) => {
  if (transaction.type !== "expense") return null;
  const month = transaction.date.slice(0, 7);
  if (month !== new Date().toISOString().slice(0, 7)) return null;
  const budgets = await Budget.findOne({ user_id: userId }).lean();
  const budget = budgets?.budgets?.find(
    (row) => row.isActive !== false && row.period === "monthly" && row.category === transaction.category,
  );
  if (!budget?.budgetAmount) return null;
  const spent = doc.transactions
    .filter((row) => row.type === "expense" && row.category === budget.category && row.date.startsWith(month))
    .reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const before = spent - Math.abs(transaction.amount);
  if (spent <= budget.budgetAmount || before > budget.budgetAmount) return null;
  const alert = {
    category: budget.category,
    spent: Math.round(spent),
    budget: budget.budgetAmount,
  };
  await notify(userId, {
    key: `budget:${budget.category}:${month}:over`,
    kind: "budget",
    title: `${budget.category} budget is used up`,
    body: `₹${alert.spent.toLocaleString("en-IN")} of ₹${alert.budget.toLocaleString("en-IN")} this month.`,
    href: "/money/budgets",
  }).catch(() => {});
  return alert;
};

// Get all transactions for a user
export const getTransactions = handle(async (req, res) => {
  const doc = await Transaction.findOne({ user_id: req.auth.userId }).lean();
  res.json({ success: true, data: doc?.transactions || [] });
});

// Create a new transaction. A missing category is filled in by the user's
// rules, known merchants or AI.
export const createTransaction = handle(async (req, res) => {
  const userId = req.auth.userId;
  const { date, amount, type, category, description, account, tags, note } = req.body;

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
    tags: cleanTags(tags),
    note: note ? String(note).trim().slice(0, 500) : undefined,
    created_at: new Date(),
  };

  const doc =
    (await Transaction.findOne({ user_id: userId })) ||
    new Transaction({ user_id: userId, transactions: [] });
  if (!category) await categorize(userId, [transaction], doc.transactions);

  doc.transactions.push(transaction);
  await doc.save();
  const budgetAlert = await checkBudget(userId, doc, transaction).catch(() => null);
  res.status(201).json({ success: true, data: transaction, budgetAlert });
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
  const { date, amount, type, category, description, account, remember, tags, note } = req.body;

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
  if (tags !== undefined) transaction.tags = cleanTags(tags);
  if (note !== undefined) transaction.note = String(note || "").trim().slice(0, 500) || undefined;

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

// Splits one transaction into parts with their own categories, e.g. a
// supermarket bill that was half groceries and half household
export const splitTransaction = handle(async (req, res) => {
  const doc = await Transaction.findOne({ user_id: req.auth.userId });
  const index = doc?.transactions.findIndex((row) => row.id === req.params.transactionId) ?? -1;
  if (index === -1) throw new ApiError(404, "Transaction not found");
  const original = doc.transactions[index];

  const parts = Array.isArray(req.body.parts) ? req.body.parts : [];
  if (parts.length < 2 || parts.length > 10) throw new ApiError(400, "Split into between two and ten parts");
  const total = Math.abs(original.amount);
  const amounts = parts.map((part) => Math.abs(parseFloat(part.amount)));
  if (amounts.some((value) => !Number.isFinite(value) || value <= 0)) throw new ApiError(400, "Each part needs an amount");
  if (Math.abs(amounts.reduce((sum, value) => sum + value, 0) - total) > 0.5) {
    throw new ApiError(400, `The parts must add up to ₹${total.toLocaleString("en-IN")}`);
  }

  const sign = original.type === "expense" ? -1 : 1;
  const base = original.toObject();
  const created = parts.map((part, position) => ({
    ...base,
    _id: undefined,
    id: uuidv4(),
    amount: sign * amounts[position],
    category: String(part.category || original.category).trim().slice(0, 60),
    category_source: "user",
    split_from: original.split_from || original.id,
    created_at: new Date(),
  }));
  doc.transactions.splice(index, 1, ...created);
  await doc.save();
  res.json({ success: true, data: created });
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
