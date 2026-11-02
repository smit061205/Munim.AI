import {
  Asset,
  Budget,
  CreditScore,
  EPF,
  Investment,
  Liability,
  Transaction,
} from "../models/Financial.js";
import {
  Bill,
  CategoryRule,
  Goal,
  Insurance,
  NetWorthSnapshot,
} from "../models/Planning.js";

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
  { category: "Entertainment", count: 2, min: 300, max: 1500, names: ["BookMyShow", "PVR Cinemas"] },
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

    // Subscriptions, so recurring payments and a price rise can be found
    add(day(12), back <= 1 ? 649 : 499, "expense", "Entertainment", "Netflix");
    add(day(20), 119, "expense", "Entertainment", "Spotify");
    add(day(15), 999, "expense", "Utilities", "Airtel broadband");

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

  // A charge that went through twice, for the unusual activity check
  const recent = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const nextDay = new Date(recent.getTime() + 24 * 60 * 60 * 1000);
  add(recent, 2499, "expense", "Shopping", "Amazon");
  add(nextDay, 2499, "expense", "Shopping", "Amazon");

  return transactions;
};

const monthsAgo = (months, day = 7) => {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months);
  date.setUTCDate(day);
  return dateKey(date);
};

// Buys spread over a few years, one partial sale this financial year, and
// one holding at a loss, so returns and tax pages have something to show
const STOCKS = [
  { symbol: "HDFCBANK", company_name: "HDFC Bank", sector: "Financials", price: 1725, lots: [[40, 30, 1480], [22, 30, 1560]] },
  { symbol: "INFY", company_name: "Infosys", sector: "Technology", price: 1610, lots: [[34, 55, 1390]] },
  { symbol: "RELIANCE", company_name: "Reliance Industries", sector: "Energy", price: 1420, lots: [[28, 40, 1190]] },
  { symbol: "ITC", company_name: "ITC", sector: "Consumer", price: 452, lots: [[44, 160, 395]], sold: [3, 40, 468] },
  { symbol: "ASIANPAINT", company_name: "Asian Paints", sector: "Materials", price: 2380, lots: [[16, 18, 3120]] },
];

// Monthly SIPs for three years, at a NAV that grew at a steady-ish rate
const FUNDS = [
  { scheme_name: "Nifty 50 Index Fund", scheme_code: "SAMPLE-IDX", category: "Index", sip: 8000, growth: 0.13, nav: 42.6, goal: "Retirement" },
  { scheme_name: "Flexi Cap Fund", scheme_code: "SAMPLE-FLX", category: "Equity", sip: 7000, growth: 0.15, nav: 78.4, goal: "Child's education", sold: 2 },
  { scheme_name: "Short Duration Debt Fund", scheme_code: "SAMPLE-DBT", category: "Debt", sip: 8000, growth: 0.07, nav: 31.2 },
  { scheme_name: "Gold ETF Fund of Fund", scheme_code: "SAMPLE-GLD", category: "Gold", sip: 2000, growth: 0.11, nav: 34.1 },
];
const SIP_MONTHS = 36;

const buildFund = (fund, goalIds) => {
  const trades = [];
  let units = 0;
  for (let back = SIP_MONTHS; back >= 1; back -= 1) {
    const nav = fund.nav / (1 + fund.growth) ** (back / 12) * (1 + (Math.random() - 0.5) * 0.06);
    const bought = fund.sip / nav;
    units += bought;
    trades.push({ date: monthsAgo(back), type: "buy", units: +bought.toFixed(3), amount: fund.sip });
  }
  if (fund.sold) {
    const nav = fund.nav / (1 + fund.growth) ** (fund.sold / 12);
    const soldUnits = units * 0.15;
    units -= soldUnits;
    trades.push({ date: monthsAgo(fund.sold, 20), type: "sell", units: +soldUnits.toFixed(3), amount: Math.round(soldUnits * nav) });
    trades.sort((a, b) => a.date.localeCompare(b.date));
  }
  return {
    scheme_name: fund.scheme_name,
    scheme_code: fund.scheme_code,
    category: fund.category,
    units: +units.toFixed(3),
    nav: fund.nav,
    nav_date: dateKey(new Date()),
    current_value: Math.round(units * fund.nav),
    invested_amount: fund.sip * SIP_MONTHS,
    purchase_date: trades[0].date,
    price_source: "sample",
    trades,
    sip: { amount: fund.sip, day: 7, start_date: trades[0].date, active: true },
    goal_id: fund.goal ? goalIds[fund.goal] : undefined,
  };
};

const buildStock = (stock) => {
  const trades = stock.lots.map(([back, units, price]) => ({
    date: monthsAgo(back, 14),
    type: "buy",
    units,
    amount: units * price,
  }));
  let quantity = stock.lots.reduce((sum, [, units]) => sum + units, 0);
  if (stock.sold) {
    const [back, units, price] = stock.sold;
    trades.push({ date: monthsAgo(back, 21), type: "sell", units, amount: units * price });
    quantity -= units;
  }
  return {
    symbol: stock.symbol,
    company_name: stock.company_name,
    sector: stock.sector,
    quantity,
    price: stock.price,
    price_date: dateKey(new Date()),
    current_value: quantity * stock.price,
    purchase_price: Math.round(stock.lots.reduce((sum, [, units, price]) => sum + units * price, 0) / stock.lots.reduce((sum, [, units]) => sum + units, 0)),
    purchase_date: trades[0].date,
    price_source: "sample",
    trades: trades.sort((a, b) => a.date.localeCompare(b.date)),
  };
};

const buildOther = (goalIds) => [
  { id: shortId("fd"), kind: "fd", name: "HDFC Bank FD", institution: "HDFC Bank", principal: 200000, rate: 7.1, start_date: monthsAgo(14, 3), maturity_date: monthsAgo(-10, 3) },
  { id: shortId("ppf"), kind: "ppf", name: "PPF account", institution: "SBI", current_value: 480000, rate: 7.1, goal_id: goalIds.Retirement },
  { id: shortId("nps"), kind: "nps", name: "NPS Tier I", institution: "NSDL", current_value: 320000, equity_share: 60, goal_id: goalIds.Retirement },
  { id: shortId("sgb"), kind: "sgb", name: "Sovereign Gold Bond 2021", grams: 10, current_value: 76000, principal: 48000, start_date: monthsAgo(40, 10) },
];

const buildPortfolio = (goalIds) => {
  const stocks = STOCKS.map(buildStock);
  const mutual_funds = FUNDS.map((fund) => buildFund(fund, goalIds));
  return {
    stocks,
    mutual_funds,
    other: buildOther(goalIds),
    total_value: [...stocks, ...mutual_funds].reduce(
      (sum, item) => sum + item.current_value,
      0,
    ),
    prices_refreshed_at: new Date(),
  };
};

const daysFromNow = (days) => dateKey(new Date(Date.now() + days * 24 * 60 * 60 * 1000));

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
  const goals = await Goal.create([
    { user_id: userId, name: "Retirement", target_amount: 50000000, saved_amount: 400000, target_date: new Date(Date.now() + 24 * YEAR_MS) },
    { user_id: userId, name: "Child's education", target_amount: 2500000, saved_amount: 150000, target_date: new Date(Date.now() + 9 * YEAR_MS) },
  ]);
  const goalIds = Object.fromEntries(goals.map((goal) => [goal.name, goal._id.toString()]));
  const portfolio = buildPortfolio(goalIds);

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
    { id: shortId("lib"), type: "home_loan", remaining_balance: 4150000, monthly_payment: 38500, interest_rate: 8.6, loan_term_months: 216, due_day: 5 },
    { id: shortId("lib"), type: "credit_card", remaining_balance: 38000, monthly_payment: 6000, interest_rate: 36, due_day: 18 },
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
    Insurance.create([
      { user_id: userId, kind: "term", name: "Term plan", insurer: "HDFC Life", cover: 10000000, premium: 14500, frequency: "yearly", renewal_date: daysFromNow(20) },
      { user_id: userId, kind: "health", name: "Family floater", insurer: "Niva Bupa", cover: 1000000, premium: 22000, frequency: "yearly", renewal_date: daysFromNow(120) },
      { user_id: userId, kind: "health", name: "Parents' health cover", insurer: "Star Health", cover: 500000, premium: 31000, frequency: "yearly", renewal_date: daysFromNow(200), for_parents: true },
    ]),
    Bill.create([
      { user_id: userId, name: "Rent", amount: 38000, category: "Rent", due_day: 3 },
      { user_id: userId, name: "Electricity", amount: 1800, category: "Utilities", due_day: 10 },
      { user_id: userId, name: "Society maintenance", amount: 9000, category: "Utilities", frequency: "quarterly", due_day: 1, due_month: ((new Date().getUTCMonth() + 1) % 12) + 1 },
    ]),
    CategoryRule.create([
      { user_id: userId, match: "swiggy", category: "Dining" },
      { user_id: userId, match: "uber", category: "Transport" },
    ]),
  ]);

  const currentValue =
    assetTotal +
    portfolio.total_value +
    portfolio.other.reduce((sum, item) => sum + (item.current_value || item.principal || 0), 0) +
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
      Insurance,
      Bill,
      CategoryRule,
    ].map((Model) => Model.deleteMany({ user_id: userId })),
  );
};
