import { v4 as uuidv4 } from "uuid";
import { Budget, Transaction } from "../models/Financial.js";
import { Bill, CategoryRule, Goal } from "../models/Planning.js";
import { Memory } from "../models/Assistant.js";
import { getOverview } from "./overviewService.js";
import { getQuote, searchSchemes } from "./marketDataService.js";
import { getTaxSummary } from "./taxService.js";
import { merchantOf } from "./cashflowInsightsService.js";
import { ruleCategory } from "./categorizeService.js";
import {
  comparePrepayment,
  planDebtPayoff,
  planRetirement,
  projectSip,
} from "./calculators.js";

// Tools the assistant can call to look things up, and actions it can propose.
// Lookups respect what the user shares in Settings. Actions never run until
// the user confirms them in the chat.

const MAX_RESULT_CHARS = 7000;
const MAX_MEMORIES = 40;
const round = (value) => Math.round(value || 0);
const today = () => new Date().toISOString().slice(0, 10);

const fn = (name, description, properties = {}, required = []) => ({
  type: "function",
  function: {
    name,
    description,
    parameters: { type: "object", properties, required },
  },
});

const DATE_FIELD = { type: "string", description: "yyyy-mm-dd" };

export const TOOL_DEFINITIONS = [
  fn("search_transactions", "Find the user's transactions. Use for questions about specific spending, merchants, dates or amounts.", {
    query: { type: "string", description: "Words in the description or category, e.g. 'swiggy'" },
    category: { type: "string" },
    type: { type: "string", enum: ["income", "expense"] },
    from: DATE_FIELD,
    to: DATE_FIELD,
    min_amount: { type: "number" },
    limit: { type: "integer", description: "Up to 50 rows; totals cover every match" },
  }),
  fn("spending_breakdown", "Totals of spending or income grouped by category, month or merchant over a date range. Draws a chart for the user.", {
    group_by: { type: "string", enum: ["category", "month", "merchant"] },
    type: { type: "string", enum: ["expense", "income"] },
    from: DATE_FIELD,
    to: DATE_FIELD,
    category: { type: "string", description: "Only this category, e.g. for its month-by-month trend" },
  }, ["group_by"]),
  fn("get_portfolio", "The user's holdings with value, gain, yearly return (XIRR), asset mix against target, SIPs and the Nifty 50 comparison."),
  fn("get_budgets", "The user's budgets this month: category, amount, spent so far and status. Use to check whether a budget exists."),
  fn("get_goals","The user's goals: target, saved so far, linked investments, projected value and whether they're on track."),
  fn("get_debts", "The user's loans and cards with balance, rate and EMI."),
  fn("get_upcoming_payments", "Bills, EMIs, SIPs, insurance premiums and subscriptions due in the next five weeks, plus recurring payments found in spending."),
  fn("get_tax_summary", "This financial year's tax estimate: old vs new regime, 80C and 80D found in their records, capital gains so far and tax-loss or gain harvesting options."),
  fn("lookup_fund", "Search mutual fund schemes by name and get the latest NAV from AMFI.", {
    name: { type: "string" },
  }, ["name"]),
  fn("market_quote", "Latest price of an index (Nifty 50, Sensex, Bank Nifty) or an NSE stock symbol. Delayed about 15 minutes.", {
    symbol: { type: "string", description: "e.g. 'Nifty 50', 'Sensex', 'RELIANCE'" },
  }, ["symbol"]),
  fn("run_calculator", "Run one of the app's calculators with numbers you choose or from the user's data.", {
    kind: { type: "string", enum: ["sip", "retirement", "prepay", "debt_payoff"] },
    monthly: { type: "number", description: "sip: monthly amount" },
    years: { type: "number", description: "sip: years" },
    annual_return: { type: "number", description: "sip: expected yearly return %" },
    step_up: { type: "number", description: "sip: yearly increase %" },
    age: { type: "number" },
    retire_age: { type: "number" },
    life_age: { type: "number" },
    monthly_expense: { type: "number", description: "retirement: today's monthly spending" },
    inflation: { type: "number" },
    saved: { type: "number", description: "retirement: already saved" },
    balance: { type: "number", description: "prepay: loan balance" },
    rate: { type: "number", description: "prepay: loan rate %" },
    emi: { type: "number" },
    extra: { type: "number", description: "prepay or debt_payoff: extra each month" },
    invest_return: { type: "number", description: "prepay: return if invested instead %" },
  }, ["kind"]),
  fn("remember", "Save a lasting fact or preference the user asked you to remember (e.g. 'saving for a wedding in 2027', 'no gold'). Only when they ask, or clearly state a lasting preference.", {
    fact: { type: "string" },
  }, ["fact"]),
  fn("propose_budget", "Propose a monthly budget for a category. The user confirms before it's created.", {
    category: { type: "string" },
    amount: { type: "number" },
  }, ["category", "amount"]),
  fn("propose_goal", "Propose a new savings goal. The user confirms before it's created.", {
    name: { type: "string" },
    target_amount: { type: "number" },
    target_date: DATE_FIELD,
    saved_amount: { type: "number" },
  }, ["name", "target_amount", "target_date"]),
  fn("propose_recategorise", "Propose moving transactions whose description contains some text into another category, optionally as a lasting rule. The user confirms first.", {
    match: { type: "string", description: "Text in the description, e.g. 'swiggy'" },
    category: { type: "string" },
    make_rule: { type: "boolean", description: "Also sort future transactions this way" },
  }, ["match", "category"]),
  fn("propose_bill", "Propose a bill reminder. The user confirms first.", {
    name: { type: "string" },
    amount: { type: "number" },
    due_day: { type: "integer", description: "Day of the month, 1-31" },
  }, ["name", "amount", "due_day"]),
];

// The data each lookup needs, so turned-off categories are refused
const NEEDS = {
  search_transactions: ["transactions"],
  get_budgets: ["transactions"],
  spending_breakdown: ["transactions"],
  get_portfolio: ["investments"],
  get_debts: ["liabilities"],
  get_upcoming_payments: ["transactions"],
  get_tax_summary: ["investments"],
  propose_recategorise: ["transactions"],
};

const STEP_LABELS = {
  search_transactions: "Searched your transactions",
  spending_breakdown: "Added up your spending",
  get_portfolio: "Looked at your portfolio",
  get_budgets: "Checked your budgets",
  get_goals: "Checked your goals",
  get_debts: "Looked at your debts",
  get_upcoming_payments: "Checked upcoming payments",
  get_tax_summary: "Estimated your tax",
  lookup_fund: "Looked up fund NAVs",
  market_quote: "Checked the market price",
  run_calculator: "Ran a calculator",
  remember: "Saved to memory",
};

export const stepLabel = (name, args) =>
  name === "market_quote" && args?.symbol
    ? `Checked the price of ${args.symbol}`
    : STEP_LABELS[name] || "Prepared a change for you to confirm";

const compact = (value) => {
  const text = JSON.stringify(value);
  return text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}…(truncated)` : text;
};

const inRange = (row, from, to) => (!from || row.date >= from) && (!to || row.date <= to);

const loadTransactions = async (ctx) => {
  if (!ctx.transactions) {
    const doc = await Transaction.findOne({ user_id: ctx.userId }).lean();
    ctx.transactions = doc?.transactions || [];
  }
  return ctx.transactions;
};

const loadOverview = async (ctx) => {
  if (!ctx.overview) ctx.overview = await getOverview(ctx.user);
  return ctx.overview;
};

const HANDLERS = {
  async search_transactions(ctx, args) {
    const rows = (await loadTransactions(ctx))
      .filter((row) => inRange(row, args.from, args.to))
      .filter((row) => !args.type || row.type === args.type)
      .filter((row) => !args.category || row.category.toLowerCase() === args.category.toLowerCase())
      .filter((row) => !args.min_amount || Math.abs(row.amount) >= args.min_amount)
      .filter((row) => {
        if (!args.query) return true;
        const text = `${row.description || ""} ${row.category}`.toLowerCase();
        return args.query.toLowerCase().split(/\s+/).every((word) => text.includes(word));
      })
      .sort((a, b) => b.date.localeCompare(a.date));
    const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);
    return {
      matches: rows.length,
      total_spent: round(rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + Math.abs(row.amount), 0)),
      total_received: round(rows.filter((row) => row.type === "income").reduce((sum, row) => sum + Math.abs(row.amount), 0)),
      rows: rows.slice(0, limit).map((row) => ({
        date: row.date,
        description: row.description,
        category: row.category,
        amount: round(Math.abs(row.amount)),
        type: row.type,
      })),
    };
  },

  async spending_breakdown(ctx, args) {
    const type = args.type || "expense";
    const from = args.from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = args.to || today();
    const groups = new Map();
    for (const row of await loadTransactions(ctx)) {
      if (row.type !== type || !inRange(row, from, to)) continue;
      if (args.category && row.category.toLowerCase() !== args.category.toLowerCase()) continue;
      const key =
        args.group_by === "month" ? row.date.slice(0, 7) : args.group_by === "merchant" ? merchantOf(row) : row.category;
      groups.set(key, (groups.get(key) || 0) + Math.abs(row.amount));
    }
    let rows = [...groups.entries()].map(([label, value]) => ({ label, value: round(value) }));
    rows = args.group_by === "month" ? rows.sort((a, b) => a.label.localeCompare(b.label)) : rows.sort((a, b) => b.value - a.value).slice(0, 12);
    const total = rows.reduce((sum, row) => sum + row.value, 0);

    ctx.charts.push({
      type: args.group_by === "month" ? "column" : "bar",
      title: `${type === "income" ? "Income" : "Spending"}${args.category ? ` on ${args.category}` : ""} by ${args.group_by}, ${from} to ${to}`,
      rows,
    });
    return { from, to, type, total, rows };
  },

  async get_portfolio(ctx) {
    const { portfolio } = await loadOverview(ctx);
    return {
      value: portfolio.value,
      invested: portfolio.invested,
      gain: portfolio.gain,
      yearly_return_xirr: portfolio.returns.xirr,
      nifty_50_comparison: portfolio.returns.benchmark,
      prices_as_of: portfolio.pricesAsOf,
      allocation: portfolio.allocation.map(({ label, percent, target, value }) => ({ label, percent, target, value })),
      rebalance: portfolio.rebalance,
      sips: portfolio.sips.map(({ name, amount, day, next, missed }) => ({ name, amount, day, next, missed })),
      holdings: portfolio.holdings.slice(0, 25).map((item) => ({
        name: item.name,
        kind: item.otherKind || item.kind,
        asset_class: item.assetClass,
        value: item.value,
        invested: item.invested,
        gain: item.gain,
        xirr: item.xirr,
        weight: item.weight,
      })),
    };
  },

  async get_budgets(ctx) {
    // The overview may be from before a budget was just confirmed
    ctx.overview = await getOverview(ctx.user);
    return {
      budgets: (ctx.overview.budgets || []).map((budget) => ({
        category: budget.category,
        budget: budget.budgetAmount,
        spent_this_month: budget.spentAmount,
        percent_used: budget.percentUsed,
      })),
    };
  },

  async get_goals(ctx) {
    const { goals, expectedReturns } = await loadOverview(ctx);
    return {
      assumed_yearly_returns: expectedReturns,
      goals: goals.map((goal) => ({
        name: goal.name,
        target: goal.target_amount,
        target_date: goal.target_date.toISOString?.().slice(0, 10) || goal.target_date,
        current: goal.current,
        linked_investments: goal.linked.map((item) => item.name),
        monthly_going_in: goal.linkedMonthly,
        projected: goal.projected,
        status: goal.status,
        extra_monthly_needed: goal.extraMonthly,
      })),
    };
  },

  async get_debts(ctx) {
    const { liabilities } = await loadOverview(ctx);
    return {
      total: liabilities.total,
      monthly_payments: liabilities.monthlyPayment,
      debts: liabilities.items.map((item) => ({
        type: item.type,
        balance: item.remaining_balance,
        rate: item.interest_rate,
        emi: item.monthly_payment,
        due_day: item.due_day,
      })),
    };
  },

  async get_upcoming_payments(ctx) {
    const { upcoming, recurring } = await loadOverview(ctx);
    return {
      upcoming: upcoming.map(({ date, name, amount, kind }) => ({ date, name, amount, kind })),
      recurring: recurring
        .filter((row) => row.active)
        .map(({ name, cadence, amount, monthlyCost, subscription, priceIncrease }) => ({ name, cadence, amount, monthlyCost, subscription, priceIncrease })),
    };
  },

  async get_tax_summary(ctx) {
    const summary = await getTaxSummary(ctx.userId);
    return {
      fy: summary.fy,
      rules: summary.rules,
      salary_used: summary.profile.salary,
      salary_is_estimate: summary.profile.salaryIsEstimate,
      regimes: summary.regimes,
      deductions: summary.deductions,
      capital_gains: { ...summary.capitalGains, sales: summary.capitalGains.sales.slice(0, 10) },
      harvesting: summary.harvesting,
      days_to_year_end: summary.daysToYearEnd,
    };
  },

  async lookup_fund(ctx, args) {
    return { source: "AMFI", schemes: await searchSchemes(args.name || "", 6) };
  },

  async market_quote(ctx, args) {
    try {
      return { ...(await getQuote(args.symbol || "")), source: "Yahoo Finance, delayed about 15 minutes" };
    } catch {
      return { error: `No price found for ${args.symbol}. For NSE stocks use the trading symbol, e.g. RELIANCE.` };
    }
  },

  async run_calculator(ctx, args) {
    if (args.kind === "sip") {
      const result = projectSip({
        monthly: args.monthly || 10000,
        years: args.years || 10,
        annualReturn: args.annual_return ?? 11,
        stepUp: args.step_up || 0,
      });
      return { invested: round(result.invested), value: round(result.value), gain: round(result.gain), by_year: result.rows.filter((row, index) => index % 5 === 0 || index === result.rows.length - 1) };
    }
    if (args.kind === "retirement") {
      const result = planRetirement({
        age: args.age || 30,
        retireAge: args.retire_age || 60,
        lifeAge: args.life_age || 85,
        monthlyExpense: args.monthly_expense || 50000,
        inflation: args.inflation ?? 6,
        growthReturn: args.annual_return ?? 11,
        retiredReturn: 7,
        saved: args.saved || 0,
      });
      return { corpus_needed: round(result.corpus), projected_from_savings: round(result.projected), monthly_saving_needed: round(result.monthlyNeeded), first_year_spending: round(result.firstYearSpend) };
    }
    if (args.kind === "prepay") {
      const result = comparePrepayment({
        balance: args.balance,
        rate: args.rate,
        emi: args.emi,
        extra: args.extra || 0,
        investReturn: args.invest_return ?? 11,
      });
      if (result.error) return result;
      return { months_saved: result.monthsSaved, interest_saved: round(result.interestSaved), value_if_invested: round(result.invested), value_if_prepaid_then_invested: round(result.afterPrepaying), better: result.betterOption };
    }
    if (args.kind === "debt_payoff") {
      const { liabilities } = await loadOverview(ctx);
      const result = planDebtPayoff({
        debts: liabilities.items.map((item) => ({ name: item.type.replace(/_/g, " "), balance: item.remaining_balance, rate: item.interest_rate || 0, minimum: item.monthly_payment || 0 })),
        extra: args.extra || 0,
      });
      if (result.error) return result;
      const summary = (plan) => ({ months: plan.months, interest: round(plan.interest), order: plan.order });
      return { avalanche: summary(result.avalanche), snowball: summary(result.snowball), minimum_payments_only: summary(result.minimumOnly) };
    }
    return { error: "Unknown calculator" };
  },

  async remember(ctx, args) {
    const fact = String(args.fact || "").trim().slice(0, 300);
    if (!fact) return { error: "Nothing to remember" };
    const count = await Memory.countDocuments({ user_id: ctx.userId });
    if (count >= MAX_MEMORIES) return { error: "Memory is full. Ask the user to remove some in Settings." };
    await Memory.create({ user_id: ctx.userId, text: fact });
    return { saved: true };
  },
};

// Proposals: checked here, carried out by runAction once confirmed
const PROPOSALS = {
  propose_budget: async (args, ctx) => {
    const amount = Number(args.amount);
    if (!args.category || !(amount > 0)) return { error: "A budget needs a category and an amount" };
    const budget = (await getOverview(ctx.user)).budgets?.find(
      (row) => row.category.toLowerCase() === String(args.category).toLowerCase(),
    );
    if (budget && Math.round(budget.budgetAmount) === round(amount)) {
      return { error: `A ${args.category} budget of ₹${round(amount).toLocaleString("en-IN")} already exists. Tell the user it's already set up.` };
    }
    return {
      kind: "create_budget",
      params: { category: String(args.category).slice(0, 60), amount: round(amount) },
      summary: `Set a monthly budget of ₹${round(amount).toLocaleString("en-IN")} for ${args.category}`,
    };
  },
  propose_goal: (args) => {
    const target = Number(args.target_amount);
    if (!args.name || !(target > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(args.target_date || "") || args.target_date <= today()) {
      return { error: "A goal needs a name, an amount and a future date" };
    }
    return {
      kind: "create_goal",
      params: { name: String(args.name).slice(0, 80), target_amount: round(target), target_date: args.target_date, saved_amount: round(Number(args.saved_amount) || 0) },
      summary: `Create a goal "${args.name}" of ₹${round(target).toLocaleString("en-IN")} by ${args.target_date}`,
    };
  },
  propose_recategorise: async (args, ctx) => {
    const match = String(args.match || "").trim().toLowerCase();
    const category = String(args.category || "").trim().slice(0, 60);
    if (match.length < 2 || !category) return { error: "Say what to match and the new category" };
    const count = (await loadTransactions(ctx)).filter(
      (row) => row.category_source !== "user" && ruleCategory([{ match, category }], row) && row.category !== category,
    ).length;
    return {
      kind: "recategorise",
      params: { match, category, make_rule: args.make_rule !== false },
      summary: `Move ${count} transaction${count === 1 ? "" : "s"} matching "${match}" to ${category}${args.make_rule !== false ? ", and sort future ones the same way" : ""}`,
    };
  },
  propose_bill: (args) => {
    const day = Number(args.due_day);
    if (!args.name || !Number.isInteger(day) || day < 1 || day > 31) return { error: "A bill needs a name and a due day from 1 to 31" };
    return {
      kind: "add_bill",
      params: { name: String(args.name).slice(0, 80), amount: round(Number(args.amount) || 0), due_day: day },
      summary: `Remind you about ${args.name} (₹${round(Number(args.amount) || 0).toLocaleString("en-IN")}) on day ${day} of each month`,
    };
  },
};

// Runs one tool call. Returns the text the model sees.
export const runTool = async (ctx, call) => {
  const name = call.function?.name;
  let args = {};
  try {
    args = JSON.parse(call.function?.arguments || "{}");
  } catch {
    return compact({ error: "The arguments weren't valid JSON" });
  }

  const missing = (NEEDS[name] || []).filter((key) => !ctx.permissions[key]);
  if (missing.length) {
    return compact({ error: `The user has turned off sharing of ${missing.join(", ")} with the assistant in Settings. Tell them, and don't guess.` });
  }

  try {
    if (PROPOSALS[name]) {
      const proposal = await PROPOSALS[name](args, ctx);
      if (proposal.error) return compact(proposal);
      const action = { id: uuidv4(), status: "pending", ...proposal };
      ctx.actions.push(action);
      return compact({ status: "shown to the user with Confirm and Dismiss buttons; nothing has changed yet", summary: action.summary });
    }
    if (!HANDLERS[name]) return compact({ error: `Unknown tool ${name}` });
    return compact(await HANDLERS[name](ctx, args));
  } catch (error) {
    console.error(`Assistant tool ${name} failed:`, error);
    return compact({ error: "That lookup failed. Answer from what you already know, and say this part couldn't be checked." });
  }
};

const monthBounds = () => {
  const now = new Date();
  return {
    startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59)),
  };
};

// Carries out an action the user confirmed. Returns a short result line.
export const runAction = async (userId, action) => {
  const { params } = action;

  if (action.kind === "create_budget") {
    const doc = (await Budget.findOne({ user_id: userId })) || new Budget({ user_id: userId, budgets: [] });
    const existing = doc.budgets.find((row) => row.isActive && row.category.toLowerCase() === params.category.toLowerCase());
    if (existing) {
      doc.totalBudget += params.amount - existing.budgetAmount;
      existing.budgetAmount = params.amount;
    } else {
      doc.budgets.push({ id: uuidv4(), category: params.category, budgetAmount: params.amount, period: "monthly", ...monthBounds(), isActive: true });
      doc.totalBudget = (doc.totalBudget || 0) + params.amount;
    }
    await doc.save();
    return existing ? `Budget for ${params.category} updated` : `Budget for ${params.category} created`;
  }

  if (action.kind === "create_goal") {
    await Goal.create({ user_id: userId, ...params });
    return `Goal "${params.name}" created`;
  }

  if (action.kind === "recategorise") {
    const doc = await Transaction.findOne({ user_id: userId });
    let changed = 0;
    for (const row of doc?.transactions || []) {
      if (row.category_source === "user") continue;
      if (ruleCategory([params], row) && row.category !== params.category) {
        row.category = params.category;
        row.category_source = "rule";
        changed += 1;
      }
    }
    if (changed) await doc.save();
    if (params.make_rule) {
      await CategoryRule.findOneAndUpdate(
        { user_id: userId, match: params.match },
        { user_id: userId, match: params.match, category: params.category },
        { upsert: true },
      );
    }
    return `${changed} transaction${changed === 1 ? "" : "s"} moved to ${params.category}${params.make_rule ? ", and a rule was saved" : ""}`;
  }

  if (action.kind === "add_bill") {
    await Bill.create({ user_id: userId, ...params, frequency: "monthly" });
    return `Reminder for ${params.name} added`;
  }

  throw new Error(`Unknown action ${action.kind}`);
};
