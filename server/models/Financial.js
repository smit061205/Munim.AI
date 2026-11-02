import mongoose from "mongoose";

// Bank Account Schema
const bankAccountSchema = new mongoose.Schema({
  id: String,
  type: {
    type: String,
    enum: ["savings", "current", "checking", "investment"],
  },
  bank_name: String,
  balance: { type: Number, default: 0 },
  account_number: String,
  created_at: { type: Date, default: Date.now },
});

// Real Estate Schema
const realEstateSchema = new mongoose.Schema({
  id: String,
  type: { type: String, enum: ["residential", "commercial", "land"] },
  current_value: { type: Number, default: 0 },
  address: String,
  purchase_date: Date,
  created_at: { type: Date, default: Date.now },
});

// Vehicle Schema
const vehicleSchema = new mongoose.Schema({
  id: String,
  type: { type: String, enum: ["car", "bike", "truck", "other"] },
  current_value: { type: Number, default: 0 },
  make: String,
  model: String,
  year: Number,
  created_at: { type: Date, default: Date.now },
});

// Assets Schema
const assetSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  total_value: { type: Number, required: true, default: 0 },
  bank_accounts: [bankAccountSchema],
  real_estate: [realEstateSchema],
  vehicles: [vehicleSchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Liability Item Schema
const liabilityItemSchema = new mongoose.Schema({
  id: String,
  type: {
    type: String,
    enum: [
      "home_loan",
      "car_loan",
      "personal_loan",
      "business_loan",
      "education_loan",
      "credit_card",
    ],
  },
  remaining_balance: { type: Number, default: 0 },
  monthly_payment: { type: Number, default: 0 },
  interest_rate: Number,
  loan_term_months: Number,
  due_day: { type: Number, min: 1, max: 31 },
  created_at: { type: Date, default: Date.now },
});

// Liabilities Schema
const liabilitySchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  liabilities: [liabilityItemSchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Transaction Item Schema
const transactionItemSchema = new mongoose.Schema({
  id: String,
  date: { type: String, required: true }, // ISO date string
  amount: { type: Number, required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  category: { type: String, required: true },
  // Who chose the category, so a person's choice is never overwritten
  category_source: { type: String, enum: ["user", "rule", "ai", "import"] },
  description: String,
  account: String,
  created_at: { type: Date, default: Date.now },
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  transactions: [transactionItemSchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// EPF Schema
const epfSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  uan: String,
  member_id: String,
  employer_contribution: { type: Number, default: 0 },
  employee_contribution: { type: Number, default: 0 },
  total_balance: { type: Number, default: 0 },
  kyc_status: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Credit Score Schema
const creditScoreSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  credit_score: { type: Number, min: 300, max: 900 },
  payment_history: {
    type: String,
    enum: ["poor", "fair", "good", "excellent"],
  },
  credit_utilization: { type: Number, min: 0, max: 100 },
  score_date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// One buy or sell of a holding. Amount is what changed hands, always positive.
// These give real returns (XIRR) and the lots for capital gains.
const holdingTradeSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // yyyy-mm-dd
    type: { type: String, enum: ["buy", "sell"], required: true },
    units: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

// A monthly SIP into a fund
const sipSchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0 },
    day: { type: Number, min: 1, max: 28 },
    start_date: String,
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

// Stock Schema
const stockSchema = new mongoose.Schema({
  symbol: String,
  company_name: String,
  isin: String,
  quantity: { type: Number, default: 0 },
  current_value: { type: Number, default: 0 },
  purchase_price: Number,
  purchase_date: String,
  sector: String,
  price: Number,
  price_date: String,
  // "live" when the value follows the market, "manual" when the user sets it
  price_source: { type: String, enum: ["live", "manual", "sample"], default: "live" },
  trades: [holdingTradeSchema],
  goal_id: String,
  created_at: { type: Date, default: Date.now },
});

// Mutual Fund Schema
const mutualFundSchema = new mongoose.Schema({
  scheme_name: String,
  // The ISIN for imported funds; AMFI's code is kept separately
  scheme_code: String,
  amfi_code: String,
  units: { type: Number, default: 0 },
  current_value: { type: Number, default: 0 },
  nav: Number,
  nav_date: String,
  price_source: { type: String, enum: ["live", "manual", "sample"], default: "live" },
  category: String,
  invested_amount: { type: Number, default: 0 },
  purchase_date: String,
  trades: [holdingTradeSchema],
  sip: sipSchema,
  goal_id: String,
  created_at: { type: Date, default: Date.now },
});

// Deposits, small savings and other holdings that aren't traded daily
const otherInvestmentSchema = new mongoose.Schema({
  id: String,
  kind: {
    type: String,
    enum: ["fd", "rd", "ppf", "nps", "sgb", "bond", "other"],
    required: true,
  },
  name: String,
  institution: String,
  // Lump sum for an FD or bond, the opening amount for the rest
  principal: { type: Number, default: 0 },
  monthly_deposit: { type: Number, default: 0 },
  rate: Number,
  start_date: String,
  maturity_date: String,
  // Set by the user for PPF, NPS, gold bonds and "other"
  current_value: { type: Number, default: 0 },
  // Share of an NPS account in equity; the rest counts as debt
  equity_share: { type: Number, min: 0, max: 100 },
  grams: Number,
  goal_id: String,
  created_at: { type: Date, default: Date.now },
});

// Portfolio Schema
const portfolioSchema = new mongoose.Schema({
  total_value: { type: Number, default: 0 },
  stocks: [stockSchema],
  mutual_funds: [mutualFundSchema],
  other: [otherInvestmentSchema],
  prices_refreshed_at: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Investments Schema
const investmentSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  portfolio: portfolioSchema,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Budget Item Schema
const budgetItemSchema = new mongoose.Schema({
  id: String,
  category: { type: String, required: true },
  budgetAmount: { type: Number, required: true, default: 0 },
  spentAmount: { type: Number, default: 0 },
  period: {
    type: String,
    enum: ["weekly", "monthly", "quarterly", "yearly"],
    default: "monthly",
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["under-budget", "on-track", "over-budget"],
    default: "on-track",
  },
  isActive: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

// Budget Schema
const budgetSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  budgets: [budgetItemSchema],
  totalBudget: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Add pre-save middleware to update timestamps
assetSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

liabilitySchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

transactionSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

epfSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

creditScoreSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

investmentSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

budgetSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// Create models
const Asset = mongoose.model("Asset", assetSchema);
const Liability = mongoose.model("Liability", liabilitySchema);
const Transaction = mongoose.model("Transaction", transactionSchema);
const EPF = mongoose.model("EPF", epfSchema);
const CreditScore = mongoose.model("CreditScore", creditScoreSchema);
const Investment = mongoose.model("Investment", investmentSchema);
const Budget = mongoose.model("Budget", budgetSchema);

export { Asset, Liability, Transaction, EPF, CreditScore, Investment, Budget };
