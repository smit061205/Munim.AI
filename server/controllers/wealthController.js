import { v4 as uuidv4 } from "uuid";
import {
  Asset,
  CreditScore,
  EPF,
  Investment,
  Liability,
} from "../models/Financial.js";
import { Bill, Goal, Insurance } from "../models/Planning.js";
import { ApiError } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import { Message } from "../models/Assistant.js";
import {
  getMonthlyReport,
  getOverview,
} from "../services/overviewService.js";
import {
  clearFinancialData,
  hasFinancialData,
  loadSampleData,
} from "../services/seedService.js";

const positiveNumber = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new ApiError(400, `Enter a valid ${label}`);
  }
  return number;
};

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

const currentUser = async (req) => {
  const user = await User.findById(req.auth.userId);
  if (!user) throw new ApiError(401, "Account not found");
  return user;
};

export const overview = handle(async (req, res) => {
  res.json({ success: true, data: await getOverview(await currentUser(req)) });
});

export const monthlyReport = handle(async (req, res) => {
  const { month } = req.query;
  if (!/^\d{4}-\d{2}$/.test(month || "")) {
    throw new ApiError(400, "Choose a month");
  }
  res.json({
    success: true,
    data: await getMonthlyReport(await currentUser(req), month),
  });
});

// Property and vehicles share one shape: an id, a value and some details
const ASSET_FIELDS = {
  real_estate: ["type", "address", "current_value"],
  vehicles: ["type", "make", "model", "year", "current_value"],
};

const pickFields = (body, fields) =>
  Object.fromEntries(
    fields.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]),
  );

const assetKind = (req) => {
  const { kind } = req.params;
  if (!ASSET_FIELDS[kind]) throw new ApiError(404, "Unknown asset type");
  return kind;
};

const recalculateAssets = (doc) => {
  doc.total_value = [...doc.bank_accounts, ...doc.real_estate, ...doc.vehicles]
    .reduce((sum, item) => sum + (item.balance || item.current_value || 0), 0);
};

export const addAsset = handle(async (req, res) => {
  const userId = req.auth.userId;
  const kind = assetKind(req);
  const item = {
    id: uuidv4(),
    ...pickFields(req.body, ASSET_FIELDS[kind]),
    current_value: positiveNumber(req.body.current_value, "value"),
  };

  const doc =
    (await Asset.findOne({ user_id: userId })) ||
    new Asset({ user_id: userId, total_value: 0 });
  doc[kind].push(item);
  recalculateAssets(doc);
  await doc.save();
  res.status(201).json({ success: true, data: item });
});

export const updateAsset = handle(async (req, res) => {
  const kind = assetKind(req);
  const doc = await Asset.findOne({ user_id: req.auth.userId });
  const item = doc?.[kind].find((row) => row.id === req.params.id);
  if (!item) throw new ApiError(404, "Asset not found");

  Object.assign(item, pickFields(req.body, ASSET_FIELDS[kind]));
  recalculateAssets(doc);
  await doc.save();
  res.json({ success: true, data: item });
});

export const removeAsset = handle(async (req, res) => {
  const kind = assetKind(req);
  const doc = await Asset.findOne({ user_id: req.auth.userId });
  if (!doc) throw new ApiError(404, "Asset not found");

  doc[kind] = doc[kind].filter((row) => row.id !== req.params.id);
  recalculateAssets(doc);
  await doc.save();
  res.json({ success: true });
});

const LIABILITY_FIELDS = [
  "type",
  "remaining_balance",
  "monthly_payment",
  "interest_rate",
  "loan_term_months",
  "due_day",
];

const checkDueDay = (item) => {
  if (item.due_day === undefined || item.due_day === null || item.due_day === "") {
    delete item.due_day;
    return;
  }
  const day = Number(item.due_day);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new ApiError(400, "Choose a due date between the 1st and the 31st");
  }
  item.due_day = day;
};

export const addLiability = handle(async (req, res) => {
  const userId = req.auth.userId;
  const item = { id: uuidv4(), ...pickFields(req.body, LIABILITY_FIELDS) };
  positiveNumber(item.remaining_balance, "balance");
  checkDueDay(item);

  const doc =
    (await Liability.findOne({ user_id: userId })) ||
    new Liability({ user_id: userId });
  doc.liabilities.push(item);
  await doc.save();
  res.status(201).json({ success: true, data: item });
});

export const updateLiability = handle(async (req, res) => {
  const doc = await Liability.findOne({ user_id: req.auth.userId });
  const item = doc?.liabilities.find((row) => row.id === req.params.id);
  if (!item) throw new ApiError(404, "Debt not found");

  const fields = pickFields(req.body, LIABILITY_FIELDS);
  if ("due_day" in fields) {
    checkDueDay(fields);
    if (!("due_day" in fields)) item.due_day = undefined;
  }
  Object.assign(item, fields);
  await doc.save();
  res.json({ success: true, data: item });
});

export const removeLiability = handle(async (req, res) => {
  const doc = await Liability.findOne({ user_id: req.auth.userId });
  if (!doc) throw new ApiError(404, "Debt not found");

  doc.liabilities = doc.liabilities.filter((row) => row.id !== req.params.id);
  await doc.save();
  res.json({ success: true });
});

export const saveEpf = handle(async (req, res) => {
  const userId = req.auth.userId;
  const data = await EPF.findOneAndUpdate(
    { user_id: userId },
    {
      user_id: userId,
      uan: req.body.uan || undefined,
      total_balance: positiveNumber(req.body.total_balance, "balance"),
      employee_contribution: Number(req.body.employee_contribution) || 0,
      employer_contribution: Number(req.body.employer_contribution) || 0,
      updated_at: new Date(),
    },
    { upsert: true, new: true, runValidators: true },
  );
  res.json({ success: true, data });
});

export const saveCreditScore = handle(async (req, res) => {
  const userId = req.auth.userId;
  const score = Number(req.body.credit_score);
  if (!Number.isInteger(score) || score < 300 || score > 900) {
    throw new ApiError(400, "Credit scores are between 300 and 900");
  }
  const data = await CreditScore.findOneAndUpdate(
    { user_id: userId },
    {
      user_id: userId,
      credit_score: score,
      credit_utilization: Number(req.body.credit_utilization) || 0,
      score_date: new Date(),
      updated_at: new Date(),
    },
    { upsert: true, new: true },
  );
  res.json({ success: true, data });
});

export const createGoal = handle(async (req, res) => {
  const { name, target_amount, saved_amount, target_date } = req.body;
  if (!name?.trim()) throw new ApiError(400, "Give this goal a name");
  if (!target_date || Number.isNaN(Date.parse(target_date))) {
    throw new ApiError(400, "Choose a target date");
  }

  const goal = await Goal.create({
    user_id: req.auth.userId,
    name: name.trim(),
    target_amount: positiveNumber(target_amount, "target amount"),
    saved_amount: positiveNumber(saved_amount || 0, "saved amount"),
    target_date,
  });
  res.status(201).json({ success: true, data: goal });
});

export const updateGoal = handle(async (req, res) => {
  const goal = await Goal.findOneAndUpdate(
    { _id: req.params.id, user_id: req.auth.userId },
    pickFields(req.body, [
      "name",
      "target_amount",
      "saved_amount",
      "target_date",
    ]),
    { new: true, runValidators: true },
  );
  if (!goal) throw new ApiError(404, "Goal not found");
  res.json({ success: true, data: goal });
});

export const removeGoal = handle(async (req, res) => {
  const userId = req.auth.userId;
  const { deletedCount } = await Goal.deleteOne({ _id: req.params.id, user_id: userId });
  if (deletedCount) {
    // Investments linked to the goal stay, just without the link
    const doc = await Investment.findOne({ user_id: userId });
    if (doc?.portfolio) {
      for (const item of [...doc.portfolio.stocks, ...doc.portfolio.mutual_funds, ...doc.portfolio.other]) {
        if (item.goal_id === req.params.id) item.goal_id = null;
      }
      await doc.save();
    }
  }
  res.json({ success: true });
});

// Insurance policies
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const POLICY_KINDS = ["term", "health", "life", "other"];
const FREQUENCIES = ["monthly", "quarterly", "yearly"];

const policyFields = (body, partial) => {
  const fields = {};
  if (!partial || body.kind !== undefined) {
    if (!POLICY_KINDS.includes(body.kind)) throw new ApiError(400, "Choose the type of cover");
    fields.kind = body.kind;
  }
  if (!partial || body.name !== undefined) {
    if (!String(body.name || "").trim()) throw new ApiError(400, "Give this policy a name");
    fields.name = String(body.name).trim().slice(0, 120);
  }
  if (body.insurer !== undefined) fields.insurer = String(body.insurer).trim().slice(0, 120);
  if (!partial || body.cover !== undefined) fields.cover = positiveNumber(body.cover || 0, "cover amount");
  if (!partial || body.premium !== undefined) fields.premium = positiveNumber(body.premium || 0, "premium");
  if (body.frequency !== undefined) {
    if (!FREQUENCIES.includes(body.frequency)) throw new ApiError(400, "Choose how often the premium is paid");
    fields.frequency = body.frequency;
  }
  if (body.renewal_date !== undefined) {
    if (body.renewal_date && !DATE.test(body.renewal_date)) throw new ApiError(400, "Enter a valid renewal date");
    fields.renewal_date = body.renewal_date || undefined;
  }
  if (body.for_parents !== undefined) fields.for_parents = !!body.for_parents;
  return fields;
};

export const addInsurance = handle(async (req, res) => {
  const policy = await Insurance.create({ user_id: req.auth.userId, ...policyFields(req.body, false) });
  res.status(201).json({ success: true, data: policy });
});

export const updateInsurance = handle(async (req, res) => {
  const policy = await Insurance.findOneAndUpdate(
    { _id: req.params.id, user_id: req.auth.userId },
    policyFields(req.body, true),
    { new: true, runValidators: true },
  );
  if (!policy) throw new ApiError(404, "Policy not found");
  res.json({ success: true, data: policy });
});

export const removeInsurance = handle(async (req, res) => {
  await Insurance.deleteOne({ _id: req.params.id, user_id: req.auth.userId });
  res.json({ success: true });
});

// Bills to be reminded about
const billFields = (body, partial) => {
  const fields = {};
  if (!partial || body.name !== undefined) {
    if (!String(body.name || "").trim()) throw new ApiError(400, "Give this bill a name");
    fields.name = String(body.name).trim().slice(0, 120);
  }
  if (!partial || body.amount !== undefined) fields.amount = positiveNumber(body.amount || 0, "amount");
  if (body.category !== undefined) fields.category = String(body.category).trim().slice(0, 60) || "Bills";
  if (body.frequency !== undefined) {
    if (!FREQUENCIES.includes(body.frequency)) throw new ApiError(400, "Choose how often it's due");
    fields.frequency = body.frequency;
  }
  if (!partial || body.due_day !== undefined) {
    const day = Number(body.due_day);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      throw new ApiError(400, "Choose a due date between the 1st and the 31st");
    }
    fields.due_day = day;
  }
  if (body.due_month !== undefined && body.due_month !== null && body.due_month !== "") {
    const month = Number(body.due_month);
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new ApiError(400, "Choose the month it's next due");
    fields.due_month = month;
  }
  if ((fields.frequency || "monthly") !== "monthly" && !partial && !fields.due_month) {
    throw new ApiError(400, "Choose the month it's next due");
  }
  if (body.active !== undefined) fields.active = !!body.active;
  return fields;
};

export const addBill = handle(async (req, res) => {
  const bill = await Bill.create({ user_id: req.auth.userId, ...billFields(req.body, false) });
  res.status(201).json({ success: true, data: bill });
});

export const updateBill = handle(async (req, res) => {
  const bill = await Bill.findOneAndUpdate(
    { _id: req.params.id, user_id: req.auth.userId },
    billFields(req.body, true),
    { new: true, runValidators: true },
  );
  if (!bill) throw new ApiError(404, "Bill not found");
  res.json({ success: true, data: bill });
});

export const removeBill = handle(async (req, res) => {
  await Bill.deleteOne({ _id: req.params.id, user_id: req.auth.userId });
  res.json({ success: true });
});

export const addSampleData = handle(async (req, res) => {
  const user = await currentUser(req);
  if (await hasFinancialData(user.id)) {
    throw new ApiError(
      409,
      "Sample data can only be added to an empty account",
    );
  }
  await loadSampleData(user.id);
  user.hasSampleData = true;
  await user.save();
  res.status(201).json({ success: true });
});

export const removeSampleData = handle(async (req, res) => {
  const user = await currentUser(req);
  if (!user.hasSampleData) {
    throw new ApiError(400, "This account has no sample data");
  }
  await clearFinancialData(user.id);
  user.hasSampleData = false;
  await user.save();
  res.json({ success: true });
});

// Everything held for the user, as a downloadable JSON document
export const exportData = handle(async (req, res) => {
  const user = await currentUser(req);
  const overviewData = await getOverview(user);
  const messages = await Message.find({ user_id: user.id })
    .sort({ created_at: 1 })
    .select("conversation_id role content created_at -_id")
    .lean();

  res.json({
    success: true,
    data: {
      exportedAt: new Date().toISOString(),
      profile: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        investorProfile: user.investorProfile,
      },
      finances: overviewData,
      assistantMessages: messages,
    },
  });
});
