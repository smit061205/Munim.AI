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
  user_id: { type: String, required: true }, // Links to Clerk user ID
  clerkId: { type: String, required: true }, // Direct Clerk reference
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
  created_at: { type: Date, default: Date.now },
});

// Liabilities Schema
const liabilitySchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  clerkId: { type: String, required: true },
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
  description: String,
  account: String,
  created_at: { type: Date, default: Date.now },
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  clerkId: { type: String, required: true },
  transactions: [transactionItemSchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// EPF Schema
const epfSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  clerkId: { type: String, required: true },
  uan: { type: String, unique: true },
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
  clerkId: { type: String, required: true },
  credit_score: { type: Number, min: 300, max: 850 },
  payment_history: {
    type: String,
    enum: ["poor", "fair", "good", "excellent"],
  },
  credit_utilization: { type: Number, min: 0, max: 100 },
  score_date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Stock Schema
const stockSchema = new mongoose.Schema({
  symbol: String,
  company_name: String,
  quantity: { type: Number, default: 0 },
  current_value: { type: Number, default: 0 },
  purchase_price: Number,
  sector: String,
  created_at: { type: Date, default: Date.now },
});

// Mutual Fund Schema
const mutualFundSchema = new mongoose.Schema({
  scheme_name: String,
  scheme_code: String,
  units: { type: Number, default: 0 },
  current_value: { type: Number, default: 0 },
  nav: Number,
  category: String,
  created_at: { type: Date, default: Date.now },
});

// Portfolio Schema
const portfolioSchema = new mongoose.Schema({
  total_value: { type: Number, default: 0 },
  stocks: [stockSchema],
  mutual_funds: [mutualFundSchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Investments Schema
const investmentSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  clerkId: { type: String, required: true },
  portfolio: portfolioSchema,
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

// Create models
const Asset = mongoose.model("Asset", assetSchema);
const Liability = mongoose.model("Liability", liabilitySchema);
const Transaction = mongoose.model("Transaction", transactionSchema);
const EPF = mongoose.model("EPF", epfSchema);
const CreditScore = mongoose.model("CreditScore", creditScoreSchema);
const Investment = mongoose.model("Investment", investmentSchema);

export { Asset, Liability, Transaction, EPF, CreditScore, Investment };
