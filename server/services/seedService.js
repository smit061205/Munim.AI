import {
  Asset,
  Budget,
  CreditScore,
  EPF,
  Investment,
  Liability,
  Transaction,
} from "../models/Financial.js";
import { Goal, NetWorthSnapshot } from "../models/Planning.js";

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

const randomBetween = (min, max) =>
  Math.round(min + Math.random() * (max - min));
const pick = (items) => items[Math.floor(Math.random() * items.length)];
const shortId = (prefix) =>
  `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
const dateKey = (date) => date.toISOString().slice(0, 10);

const MONTHLY_SPENDING = [
  { category: "Groceries", count: 5, min: 900, max: 2800, names: ["BigBasket", "DMart", "Reliance Fresh"] },
  { category: "Dining", count: 6, min: 250, max: 1400, names: ["Swiggy", "Zomato", "Blue Tokai"] },
  { category: "Transport", count: 5, min: 120, max: 700, names: ["Uber", "Ola", "Metro card"] },
  { category: "Utilities", count: 3, min: 800, max: 2400, names: ["Electricity bill", "Broadband", "Mobile bill"] },
  { category: "Shopping", count: 2, min: 900, max: 5200, names: ["Amazon", "Myntra", "Croma"] },
  { category: "Entertainment", count: 2, min: 300, max: 1500, names: ["Netflix", "BookMyShow", "Spotify"] },
  { category: "Healthcare", count: 1, min: 400, max: 2600, names: ["Apollo Pharmacy", "Practo"] },
];

const buildTransactions = () => {
  const transactions = [];
  const now = new Date();
  const add = (date, amount, type, category, description) => {
    if (date > now) return;
    transactions.push({
      id: shortId("txn"),
      date: dateKey(date),
      amount: type === "expense" ? -amount : amount,
      type,
      category,
      description,
      account: "HDFC Savings",
    });
  };

  for (let back = 11; back >= 0; back -= 1) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() - back;
    const day = (value) => new Date(Date.UTC(year, month, value));

    add(day(1), 165000, "income", "Salary", "Salary credit");
    add(day(3), 38000, "expense", "Rent", "Monthly rent");
    add(day(5), 38500, "expense", "EMI", "Home loan EMI");
    add(day(7), 25000, "expense", "Investments", "Monthly SIP");

    if (back % 4 === 1) {
      add(day(18), randomBetween(9000, 22000), "income", "Freelance", "Design project");
    }

    for (const row of MONTHLY_SPENDING) {
      for (let index = 0; index < row.count; index += 1) {
        add(
          day(randomBetween(1, 28)),
          randomBetween(row.min, row.max),
          "expense",
          row.category,
          pick(row.names),
        );
      }
    }
  }

  return transactions;
};

const STOCKS = [
  { symbol: "HDFCBANK", company_name: "HDFC Bank", quantity: 60, purchase_price: 1480, price: 1725, sector: "Financials" },
  { symbol: "INFY", company_name: "Infosys", quantity: 55, purchase_price: 1390, price: 1610, sector: "Technology" },
  { symbol: "RELIANCE", company_name: "Reliance Industries", quantity: 40, purchase_price: 2380, price: 2915, sector: "Energy" },
  { symbol: "ITC", company_name: "ITC", quantity: 120, purchase_price: 395, price: 452, sector: "Consumer" },
  { symbol: "ASIANPAINT", company_name: "Asian Paints", quantity: 18, purchase_price: 3120, price: 2860, sector: "Materials" },
];

const FUNDS = [
  { scheme_name: "Nifty 50 Index Fund", scheme_code: "SAMPLE-IDX", category: "Index", units: 9200, nav: 42.6, invested_amount: 310000 },
  { scheme_name: "Flexi Cap Fund", scheme_code: "SAMPLE-FLX", category: "Equity", units: 3100, nav: 78.4, invested_amount: 190000 },
  { scheme_name: "Short Duration Debt Fund", scheme_code: "SAMPLE-DBT", category: "Debt", units: 11800, nav: 31.2, invested_amount: 335000 },
  { scheme_name: "Gold ETF Fund of Fund", scheme_code: "SAMPLE-GLD", category: "Gold", units: 2600, nav: 34.1, invested_amount: 72000 },
];

const buildPortfolio = () => {
  const stocks = STOCKS.map(({ price, ...stock }) => ({
    ...stock,
    current_value: stock.quantity * price,
  }));
  const mutual_funds = FUNDS.map((fund) => ({
    ...fund,
    current_value: Math.round(fund.units * fund.nav),
  }));
  return {
    stocks,
    mutual_funds,
    total_value: [...stocks, ...mutual_funds].reduce(
      (sum, item) => sum + item.current_value,
      0,
    ),
  };
};

const buildBudgets = () => {
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  return [
    ["Groceries", 12000],
    ["Dining", 5000],
    ["Transport", 3500],
    ["Shopping", 6000],
    ["Entertainment", 2500],
  ].map(([category, budgetAmount]) => ({
    id: shortId("budget"),
    category,
    budgetAmount,
    period: "monthly",
    startDate,
    endDate,
    isActive: true,
  }));
};

// A plausible past path that ends at today's value
const buildSnapshots = (userId, currentValue) => {
  const snapshots = [];
  for (let back = 12; back >= 1; back -= 1) {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - back);
    snapshots.push({
      user_id: userId,
      date: dateKey(date),
      value: Math.round(
        currentValue * (1 - back * 0.012) + randomBetween(-40000, 40000),
      ),
    });
  }
  return snapshots;
};

export const hasFinancialData = async (userId) => {
  const counts = await Promise.all(
    [Asset, Liability, Transaction, Investment, EPF].map((Model) =>
      Model.countDocuments({ user_id: userId }),
    ),
  );
  return counts.some((count) => count > 0);
};

/**
 * Fills an empty account with clearly labelled sample data, so the app can be
 * explored or demonstrated before real data is added.
 *
 * @param {string} userId - The user ID
 */
export const loadSampleData = async (userId) => {
  const portfolio = buildPortfolio();

  const bank_accounts = [
    { id: shortId("acc"), type: "savings", bank_name: "HDFC Savings", balance: 340000, account_number: "****4821" },
    { id: shortId("acc"), type: "savings", bank_name: "Kotak Emergency Fund", balance: 260000, account_number: "****1190" },
  ];
  const real_estate = [
    { id: shortId("re"), type: "residential", current_value: 7800000, address: "2BHK, Pune" },
  ];
  const vehicles = [
    { id: shortId("veh"), type: "car", current_value: 620000, make: "Honda", model: "City", year: 2022 },
  ];
  const liabilities = [
    { id: shortId("lib"), type: "home_loan", remaining_balance: 4150000, monthly_payment: 38500, interest_rate: 8.6, loan_term_months: 216 },
    { id: shortId("lib"), type: "credit_card", remaining_balance: 38000, monthly_payment: 6000, interest_rate: 36 },
  ];
  const epf = {
    uan: `SAMPLE-${shortId("uan")}`,
    member_id: "SAMPLE",
    employee_contribution: 14400,
    employer_contribution: 14400,
    total_balance: 945000,
    kyc_status: "verified",
  };

  const assetTotal =
    bank_accounts.reduce((sum, item) => sum + item.balance, 0) +
    [...real_estate, ...vehicles].reduce(
      (sum, item) => sum + item.current_value,
      0,
    );

  await Promise.all([
    Transaction.create({ user_id: userId, transactions: buildTransactions() }),
    Investment.create({ user_id: userId, portfolio }),
    Asset.create({ user_id: userId, total_value: assetTotal, bank_accounts, real_estate, vehicles }),
    Liability.create({ user_id: userId, liabilities }),
    EPF.create({ user_id: userId, ...epf }),
    CreditScore.create({ user_id: userId, credit_score: 768, payment_history: "good", credit_utilization: 22 }),
    Budget.create({ user_id: userId, budgets: buildBudgets(), totalBudget: 29000 }),
    Goal.create([
      { user_id: userId, name: "Retirement", target_amount: 50000000, saved_amount: 2400000, target_date: new Date(Date.now() + 24 * YEAR_MS) },
      { user_id: userId, name: "Child's education", target_amount: 2500000, saved_amount: 420000, target_date: new Date(Date.now() + 9 * YEAR_MS) },
    ]),
  ]);

  const currentValue =
    assetTotal +
    portfolio.total_value +
    epf.total_balance -
    liabilities.reduce((sum, item) => sum + item.remaining_balance, 0);
  await NetWorthSnapshot.insertMany(buildSnapshots(userId, currentValue));
};

// Removes every financial record the user has
export const clearFinancialData = async (userId) => {
  await Promise.all(
    [
      Asset,
      Liability,
      Transaction,
      EPF,
      CreditScore,
      Investment,
      Budget,
      Goal,
      NetWorthSnapshot,
    ].map((Model) => Model.deleteMany({ user_id: userId })),
  );
};
