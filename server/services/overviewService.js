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

const CASHFLOW_MONTHS = 12;
const SPENDING_WINDOW_DAYS = 90;
const EMERGENCY_FUND_MONTHS = 6;
const ALLOCATION_DRIFT_POINTS = 10;
const HIGH_INTEREST_RATE = 15;
const REBALANCE_BAND_POINTS = 3;
const REBALANCE_ROUNDING = 100;

const round = (value) => Math.round(value || 0);
const percent = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);
const toDateKey = (date) => date.toISOString().slice(0, 10);

const monthKey = (date) => date.slice(0, 7);

const lastMonths = (count) => {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index), 1),
    );
    return toDateKey(date).slice(0, 7);
  });
};

// Which side of the target mix a mutual fund counts towards
const assetClassOfFund = (category = "") => {
  const name = category.toLowerCase();
  if (/gold/.test(name)) return "gold";
  if (/debt|liquid|bond|gilt|fixed/.test(name)) return "debt";
  return "equity";
};

const toNearest = (value) =>
  Math.round(value / REBALANCE_ROUNDING) * REBALANCE_ROUNDING;

// What it would take to get back to the target mix, at asset-class level.
// EPF counts towards debt but can't be moved, so it is never "reduced".
const buildRebalance = (allocation, epfBalance, drift) => {
  const total = allocation.reduce((sum, slice) => sum + slice.value, 0);
  if (!total || allocation.some((slice) => slice.target === null)) return null;

  const classes = allocation.map((slice) => ({
    ...slice,
    difference: (total * slice.target) / 100 - slice.value,
    movable:
      slice.key === "debt" ? Math.max(slice.value - epfBalance, 0) : slice.value,
  }));

  const over = classes.filter((slice) => slice.difference < 0);
  const under = classes.filter((slice) => slice.difference > 0);

  const reductions = over.map((slice) => ({
    ...slice,
    amount: Math.min(-slice.difference, slice.movable),
  }));
  const moved = reductions.reduce((sum, slice) => sum + slice.amount, 0);
  const wanted = under.reduce((sum, slice) => sum + slice.difference, 0);

  const toMove = (slice, action, amount) => ({
    key: slice.key,
    label: slice.label,
    action,
    amount: toNearest(amount),
  });

  // New money alone: enough that no class is above its target share
  const grownTotal = Math.max(
    ...allocation
      .filter((slice) => slice.target > 0)
      .map((slice) => (slice.value * 100) / slice.target),
  );

  return {
    onTarget: drift < REBALANCE_BAND_POINTS,
    limitedByEpf: reductions.some(
      (slice) => slice.key === "debt" && slice.amount < -slice.difference,
    ),
    moves: [
      ...reductions.map((slice) => toMove(slice, "reduce", slice.amount)),
      ...under.map((slice) =>
        toMove(slice, "add", (slice.difference * moved) / (wanted || 1)),
      ),
    ].filter((move) => move.amount > 0),
    newMoney: {
      total: toNearest(grownTotal - total),
      split: allocation
        .map((slice) =>
          toMove(slice, "add", (grownTotal * slice.target) / 100 - slice.value),
        )
        .filter((move) => move.amount > 0),
    },
  };
};

const buildPortfolio = (doc, epf, cash, target) => {
  const stocks = doc?.portfolio?.stocks || [];
  const funds = doc?.portfolio?.mutual_funds || [];

  const holdings = [
    ...stocks.map((stock) => ({
      id: stock._id.toString(),
      kind: "stock",
      name: stock.company_name,
      symbol: stock.symbol,
      detail: stock.sector,
      assetClass: "equity",
      quantity: stock.quantity,
      value: stock.current_value,
      invested: stock.quantity * (stock.purchase_price || 0),
    })),
    ...funds.map((fund) => ({
      id: fund._id.toString(),
      kind: "mutual_fund",
      name: fund.scheme_name,
      symbol: fund.scheme_code,
      detail: fund.category,
      assetClass: assetClassOfFund(fund.category),
      quantity: fund.units,
      value: fund.current_value,
      invested: fund.invested_amount || 0,
    })),
  ].sort((a, b) => b.value - a.value);

  const value = holdings.reduce((sum, item) => sum + item.value, 0);
  const invested = holdings.reduce((sum, item) => sum + item.invested, 0);
  // Gain is only meaningful for holdings with a known purchase cost
  const costed = holdings.filter((item) => item.invested > 0);
  const costedValue = costed.reduce((sum, item) => sum + item.value, 0);
  const gain = costedValue - invested;

  // EPF is long-term debt, so it counts towards the mix the user is aiming for
  const amounts = {
    equity: holdings
      .filter((item) => item.assetClass === "equity")
      .reduce((sum, item) => sum + item.value, 0),
    debt:
      holdings
        .filter((item) => item.assetClass === "debt")
        .reduce((sum, item) => sum + item.value, 0) +
      (epf?.total_balance || 0),
    gold: holdings
      .filter((item) => item.assetClass === "gold")
      .reduce((sum, item) => sum + item.value, 0),
  };
  const allocationTotal = amounts.equity + amounts.debt + amounts.gold;

  const allocation = [
    { key: "equity", label: "Equity" },
    { key: "debt", label: "Debt" },
    { key: "gold", label: "Gold" },
  ].map(({ key, label }) => ({
    key,
    label,
    value: round(amounts[key]),
    percent: Math.round(percent(amounts[key], allocationTotal)),
    target: target?.[key] ?? null,
  }));

  const drift = target
    ? Math.max(
        ...allocation.map((slice) =>
          Math.abs(slice.percent - (slice.target ?? slice.percent)),
        ),
      )
    : 0;

  return {
    value: round(value),
    invested: round(invested),
    gain: round(gain),
    gainPercent: invested > 0 ? +percent(gain, invested).toFixed(1) : 0,
    holdings: holdings.map((item) => ({
      ...item,
      gain: item.invested > 0 ? round(item.value - item.invested) : null,
      weight: +percent(item.value, value).toFixed(1),
    })),
    allocation,
    drift,
    rebalance: target
      ? buildRebalance(allocation, epf?.total_balance || 0, drift)
      : null,
    cashShare: Math.round(percent(cash, cash + allocationTotal)),
  };
};

const buildCashflow = (transactions) => {
  const months = lastMonths(CASHFLOW_MONTHS).map((month) => ({
    month,
    income: 0,
    expense: 0,
  }));
  const byMonth = new Map(months.map((row) => [row.month, row]));

  for (const transaction of transactions) {
    const row = byMonth.get(monthKey(transaction.date));
    if (!row) continue;
    row[transaction.type] += Math.abs(transaction.amount);
  }

  const rows = months.map((row) => ({
    ...row,
    income: round(row.income),
    expense: round(row.expense),
    net: round(row.income - row.expense),
  }));

  const thisMonth = rows[rows.length - 1];
  // Complete months only, so a half-finished month doesn't flatter the average
  const complete = rows
    .slice(0, -1)
    .filter((row) => row.income > 0 || row.expense > 0)
    .slice(-3);
  const averageOf = (key) =>
    complete.length
      ? round(
          complete.reduce((sum, row) => sum + row[key], 0) / complete.length,
        )
      : 0;

  const averageMonthlyIncome = averageOf("income");
  const averageMonthlyExpense = averageOf("expense");

  return {
    months: rows,
    thisMonth,
    averageMonthlyIncome,
    averageMonthlyExpense,
    savingsRate: Math.round(
      percent(
        averageMonthlyIncome - averageMonthlyExpense,
        averageMonthlyIncome,
      ),
    ),
    forecast: {
      monthlySavings: averageMonthlyIncome - averageMonthlyExpense,
      yearlySavings: (averageMonthlyIncome - averageMonthlyExpense) * 12,
      basedOnMonths: complete.length,
    },
  };
};

const buildSpending = (transactions) => {
  const since = toDateKey(
    new Date(Date.now() - SPENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000),
  );
  const totals = new Map();

  for (const transaction of transactions) {
    if (transaction.type !== "expense" || transaction.date < since) continue;
    totals.set(
      transaction.category,
      (totals.get(transaction.category) || 0) + Math.abs(transaction.amount),
    );
  }

  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount: round(amount) }))
    .sort((a, b) => b.amount - a.amount);
};

// Spending is worked out from transactions, so budgets are always current
const buildBudgets = (doc, transactions) =>
  (doc?.budgets || [])
    .filter((budget) => budget.isActive)
    .map((budget) => {
      const start = toDateKey(budget.startDate);
      const end = toDateKey(budget.endDate);
      const category = budget.category.toLowerCase();

      const spentAmount = round(
        transactions
          .filter(
            (item) =>
              item.type === "expense" &&
              item.category.toLowerCase() === category &&
              item.date >= start &&
              item.date <= end,
          )
          .reduce((sum, item) => sum + Math.abs(item.amount), 0),
      );

      const used = percent(spentAmount, budget.budgetAmount);
      return {
        id: budget.id,
        category: budget.category,
        budgetAmount: budget.budgetAmount,
        spentAmount,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
        percentUsed: Math.round(used),
        status:
          used > 100 ? "over-budget" : used >= 80 ? "on-track" : "under-budget",
      };
    });

// Savings can only be spent once, so the nearest goals claim them first
const buildGoals = (goals, monthlySavings) => {
  let available = monthlySavings;

  return goals.map((goal) => {
    const remaining = Math.max(goal.target_amount - goal.saved_amount, 0);
    const monthsLeft = Math.max(
      (goal.target_date.getTime() - Date.now()) / (30.44 * 24 * 60 * 60 * 1000),
      1,
    );
    const monthlyNeeded = round(remaining / monthsLeft);
    const onTrack = remaining === 0 || available >= monthlyNeeded;
    if (onTrack) available -= monthlyNeeded;

    return {
      id: goal._id.toString(),
      name: goal.name,
      target_amount: goal.target_amount,
      saved_amount: goal.saved_amount,
      target_date: goal.target_date,
      progress: Math.min(
        Math.round(percent(goal.saved_amount, goal.target_amount)),
        100,
      ),
      monthlyNeeded,
      onTrack,
    };
  });
};

// Every factor is shown to the user, so the score can be explained
const buildHealth = ({ cash, cashflow, liabilities, portfolio, hasProfile }) => {
  const { averageMonthlyExpense, averageMonthlyIncome, savingsRate } = cashflow;
  const emergencyMonths =
    averageMonthlyExpense > 0 ? cash / averageMonthlyExpense : 0;
  const emiShare = percent(liabilities.monthlyPayment, averageMonthlyIncome);

  const clamp = (value) => Math.max(0, Math.min(100, value));
  const factors = [
    {
      key: "emergency",
      label: "Emergency fund",
      detail: `${emergencyMonths.toFixed(1)} months of spending`,
      score: clamp((emergencyMonths / EMERGENCY_FUND_MONTHS) * 100),
    },
    {
      key: "savings",
      label: "Savings rate",
      detail: `${savingsRate}% of income`,
      score: clamp((savingsRate / 30) * 100),
    },
    {
      key: "debt",
      label: "Debt load",
      detail: `EMIs are ${Math.round(emiShare)}% of income`,
      score: clamp(100 - (emiShare / 50) * 100),
    },
    {
      key: "allocation",
      label: "Allocation",
      detail: hasProfile
        ? `${portfolio.drift} points from your target`
        : "Finish your investor profile",
      score: hasProfile ? clamp(100 - portfolio.drift * 2.5) : 0,
    },
  ].map((factor) => ({ ...factor, score: Math.round(factor.score) }));

  const hasEnoughData = averageMonthlyIncome > 0 && averageMonthlyExpense > 0;

  return {
    score: hasEnoughData
      ? Math.round(
          factors.reduce((sum, factor) => sum + factor.score, 0) /
            factors.length,
        )
      : null,
    factors,
    emergencyMonths: +emergencyMonths.toFixed(1),
  };
};

const buildInsights = ({
  preferences,
  budgets,
  portfolio,
  liabilities,
  health,
  cashflow,
}) => {
  const insights = [];
  const enabled = {
    budgets: true,
    allocation: true,
    safety: true,
    ...preferences?.insights,
  };

  if (enabled.budgets) {
    for (const budget of budgets.filter((b) => b.status === "over-budget")) {
      insights.push({
        id: `budget-${budget.id}`,
        severity: "warning",
        title: `${budget.category} is over budget`,
        body: `You've spent ${budget.percentUsed}% of this ${budget.period} budget.`,
        href: "/cash-flow?tab=budgets",
      });
    }
  }

  if (enabled.allocation && portfolio.drift >= ALLOCATION_DRIFT_POINTS) {
    const furthest = [...portfolio.allocation].sort(
      (a, b) =>
        Math.abs(b.percent - (b.target ?? b.percent)) -
        Math.abs(a.percent - (a.target ?? a.percent)),
    )[0];
    insights.push({
      id: "allocation-drift",
      severity: "info",
      title: "Your portfolio has drifted from your target",
      body: `${furthest.label} is ${furthest.percent}% against a ${furthest.target}% target.`,
      href: "/portfolio",
    });
  }

  if (enabled.safety) {
    if (
      cashflow.averageMonthlyExpense > 0 &&
      health.emergencyMonths < EMERGENCY_FUND_MONTHS / 2
    ) {
      insights.push({
        id: "emergency-fund",
        severity: "warning",
        title: "Your emergency fund is thin",
        body: `It covers ${health.emergencyMonths} months of spending. Three to six is a common target.`,
        href: "/accounts",
      });
    }

    const costly = liabilities.items.find(
      (item) => (item.interest_rate || 0) >= HIGH_INTEREST_RATE,
    );
    if (costly) {
      insights.push({
        id: "high-interest",
        severity: "warning",
        title: "You're carrying high-interest debt",
        body: `Clearing debt at ${costly.interest_rate}% usually beats what investments can earn.`,
        href: "/accounts",
      });
    }
  }

  return insights;
};

const recordSnapshot = async (userId, value) => {
  await NetWorthSnapshot.updateOne(
    { user_id: userId, date: toDateKey(new Date()) },
    { $set: { value } },
    { upsert: true },
  );
};

// Everything the app shows about a user's money, worked out from their data
export const getOverview = async (user) => {
  const userId = user._id.toString();

  const [
    assetDoc,
    liabilityDoc,
    transactionDoc,
    epf,
    credit,
    investmentDoc,
    budgetDoc,
    goalDocs,
  ] = await Promise.all([
    Asset.findOne({ user_id: userId }).lean(),
    Liability.findOne({ user_id: userId }).lean(),
    Transaction.findOne({ user_id: userId }).lean(),
    EPF.findOne({ user_id: userId }).lean(),
    CreditScore.findOne({ user_id: userId }).lean(),
    Investment.findOne({ user_id: userId }).lean(),
    Budget.findOne({ user_id: userId }).lean(),
    Goal.find({ user_id: userId }).sort({ target_date: 1 }).lean(),
  ]);

  const transactions = transactionDoc?.transactions || [];
  const accounts = assetDoc?.bank_accounts || [];
  const realEstate = assetDoc?.real_estate || [];
  const vehicles = assetDoc?.vehicles || [];
  const debts = liabilityDoc?.liabilities || [];

  const sum = (rows, key) =>
    rows.reduce((total, row) => total + (row[key] || 0), 0);

  const cash = sum(accounts, "balance");
  const property = sum(realEstate, "current_value");
  const vehicleValue = sum(vehicles, "current_value");

  const assets = {
    cash: round(cash),
    property: round(property),
    vehicles: round(vehicleValue),
    accounts,
    realEstate,
    vehicleItems: vehicles,
  };

  const liabilities = {
    total: round(sum(debts, "remaining_balance")),
    monthlyPayment: round(sum(debts, "monthly_payment")),
    items: debts,
  };

  const profile = user.investorProfile?.riskProfile
    ? user.investorProfile
    : null;

  const portfolio = buildPortfolio(
    investmentDoc,
    epf,
    cash,
    profile?.allocation,
  );
  const cashflow = buildCashflow(transactions);
  const budgets = buildBudgets(budgetDoc, transactions);
  const goals = buildGoals(goalDocs, cashflow.forecast.monthlySavings);
  const health = buildHealth({
    cash,
    cashflow,
    liabilities,
    portfolio,
    hasProfile: !!profile,
  });

  const epfBalance = epf?.total_balance || 0;
  const netWorthValue = round(
    cash + property + vehicleValue + portfolio.value + epfBalance - liabilities.total,
  );
  const grossAssets = round(
    cash + property + vehicleValue + portfolio.value + epfBalance,
  );

  const isEmpty =
    grossAssets === 0 && liabilities.total === 0 && transactions.length === 0;

  if (!isEmpty) {
    await recordSnapshot(userId, netWorthValue);
  }

  const history = await NetWorthSnapshot.find({ user_id: userId })
    .sort({ date: 1 })
    .limit(400)
    .select("date value -_id")
    .lean();

  const monthAgo = toDateKey(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const baseline =
    [...history].reverse().find((row) => row.date <= monthAgo) || null;

  return {
    isEmpty,
    asOf: new Date().toISOString(),
    netWorth: {
      value: netWorthValue,
      grossAssets,
      change: baseline ? netWorthValue - baseline.value : null,
      changePercent: baseline?.value
        ? +percent(netWorthValue - baseline.value, Math.abs(baseline.value)).toFixed(1)
        : null,
      history,
    },
    assets,
    liabilities,
    portfolio,
    retirement: epf,
    credit,
    cashflow,
    spending: buildSpending(transactions),
    budgets,
    goals,
    health,
    insights: buildInsights({
      preferences: user.preferences,
      budgets,
      portfolio,
      liabilities,
      health,
      cashflow,
    }),
    recentTransactions: [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6),
  };
};

// A statement for one month, compared against the month before it
export const getMonthlyReport = async (user, month) => {
  const doc = await Transaction.findOne({
    user_id: user._id.toString(),
  }).lean();
  const transactions = doc?.transactions || [];

  const [year, monthNumber] = month.split("-").map(Number);
  const previous = toDateKey(new Date(Date.UTC(year, monthNumber - 2, 1))).slice(0, 7);

  const totalsFor = (key) => {
    const rows = transactions.filter((item) => monthKey(item.date) === key);
    const total = (type) =>
      round(
        rows
          .filter((item) => item.type === type)
          .reduce((sum, item) => sum + Math.abs(item.amount), 0),
      );
    return { rows, income: total("income"), expense: total("expense") };
  };

  const current = totalsFor(month);
  const before = totalsFor(previous);

  const categories = new Map();
  for (const item of current.rows) {
    if (item.type !== "expense") continue;
    categories.set(
      item.category,
      (categories.get(item.category) || 0) + Math.abs(item.amount),
    );
  }

  return {
    month,
    income: current.income,
    expense: current.expense,
    net: current.income - current.expense,
    savingsRate: Math.round(
      percent(current.income - current.expense, current.income),
    ),
    previous: {
      income: before.income,
      expense: before.expense,
      net: before.income - before.expense,
    },
    categories: [...categories.entries()]
      .map(([category, amount]) => ({
        category,
        amount: round(amount),
        share: Math.round(percent(amount, current.expense)),
      }))
      .sort((a, b) => b.amount - a.amount),
    largest: current.rows
      .filter((item) => item.type === "expense")
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 8),
    transactionCount: current.rows.length,
  };
};
