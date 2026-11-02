import { closeOn } from "./marketDataService.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_DAYS = 365;

const toTime = (date) => new Date(`${date}T00:00:00Z`).getTime();
export const todayKey = () => new Date().toISOString().slice(0, 10);

// XIRR: the yearly return that makes these dated cash flows net to zero.
// Money in is negative, money out (and today's value) is positive.
// Returns a percentage, or null when it can't be worked out.
export const xirr = (flows) => {
  const cash = flows.filter((flow) => flow.amount !== 0);
  if (cash.length < 2) return null;
  if (!cash.some((flow) => flow.amount < 0) || !cash.some((flow) => flow.amount > 0)) {
    return null;
  }

  const start = Math.min(...cash.map((flow) => toTime(flow.date)));
  const years = cash.map((flow) => (toTime(flow.date) - start) / DAY_MS / YEAR_DAYS);
  // Under about a month, an annual rate swings wildly, so it isn't shown
  if (Math.max(...years) < 30 / YEAR_DAYS) return null;

  const npv = (rate) =>
    cash.reduce((sum, flow, index) => sum + flow.amount / (1 + rate) ** years[index], 0);

  // Bisection is slower than Newton's method but can't wander off
  let low = -0.9999;
  let high = 10;
  let lowValue = npv(low);
  if (lowValue * npv(high) > 0) return null;

  for (let step = 0; step < 200; step += 1) {
    const middle = (low + high) / 2;
    const value = npv(middle);
    if (Math.abs(value) < 0.01) return +(middle * 100).toFixed(2);
    if (value * lowValue < 0) {
      high = middle;
    } else {
      low = middle;
      lowValue = value;
    }
  }
  return +(((low + high) / 2) * 100).toFixed(2);
};

// The dated money in and out of one holding, if it's known. A holding with
// trades uses them; one with just a purchase date and cost is one buy.
export const holdingFlows = (holding) => {
  if (holding.trades?.length) {
    return holding.trades.map((trade) => ({
      date: trade.date,
      amount: trade.type === "buy" ? -trade.amount : trade.amount,
    }));
  }
  const purchaseDate = holding.purchase_date || holding.purchaseDate;
  if (purchaseDate && holding.invested > 0) {
    return [{ date: purchaseDate, amount: -holding.invested }];
  }
  return [];
};

export const holdingXirr = (holding, value, date = todayKey()) => {
  const flows = holdingFlows(holding);
  if (!flows.length || !value) return null;
  return xirr([...flows, { date, amount: value }]);
};

// What the same money would be worth had it gone into the benchmark on the
// same days, and the yearly return that would have given
export const compareWithBenchmark = (flows, value, history, date = todayKey()) => {
  if (!history?.length || !flows.length) return null;
  const first = flows.reduce((min, flow) => (flow.date < min ? flow.date : min), flows[0].date);
  if (first < history[0][0]) return null;

  let units = 0;
  for (const flow of flows) {
    const close = closeOn(history, flow.date);
    if (!close) return null;
    // Money in buys index units; money out sells them
    units -= flow.amount / close;
  }
  const benchmarkValue = Math.max(units, 0) * closeOn(history, date);

  return {
    value: Math.round(benchmarkValue),
    xirr: xirr([...flows, { date, amount: benchmarkValue }]),
    difference: Math.round(value - benchmarkValue),
  };
};

const monthsBetween = (from, to) =>
  Math.max((toTime(to) - toTime(from)) / DAY_MS / 30.44, 0);

// FDs compound quarterly, as most Indian banks quote them
const fdValue = (principal, rate, months) =>
  principal * (1 + rate / 400) ** (months / 3);

// An RD is a series of monthly deposits, each compounding quarterly
const rdValue = (monthly, rate, months) => {
  let total = 0;
  for (let month = 0; month < Math.floor(months); month += 1) {
    total += fdValue(monthly, rate, months - month);
  }
  return total;
};

// Today's value of a deposit or small-savings holding. FDs and RDs are worked
// out from their rate; the rest use the value the user last entered.
export const otherInvestmentValue = (item, date = todayKey()) => {
  const rate = Number(item.rate) || 0;
  if ((item.kind === "fd" || item.kind === "bond") && item.start_date && rate) {
    const end = item.maturity_date && item.maturity_date < date ? item.maturity_date : date;
    return Math.round(fdValue(item.principal || 0, rate, monthsBetween(item.start_date, end)));
  }
  if (item.kind === "rd" && item.start_date && rate && item.monthly_deposit) {
    const end = item.maturity_date && item.maturity_date < date ? item.maturity_date : date;
    return Math.round(rdValue(item.monthly_deposit, rate, monthsBetween(item.start_date, end)));
  }
  return Math.round(item.current_value || item.principal || 0);
};

// Money put into a deposit so far
export const otherInvestmentCost = (item, date = todayKey()) => {
  if (item.kind === "rd" && item.start_date) {
    const end = item.maturity_date && item.maturity_date < date ? item.maturity_date : date;
    return Math.round((item.monthly_deposit || 0) * Math.floor(monthsBetween(item.start_date, end)));
  }
  return Math.round(item.principal || 0);
};

// Dated deposits into an FD, RD or bond, as buys, for its yearly return.
// PPF, NPS and the rest have irregular deposits that aren't recorded.
export const otherInvestmentTrades = (item, date = todayKey()) => {
  if (!item.start_date) return [];
  if ((item.kind === "fd" || item.kind === "bond") && item.principal) {
    return [{ date: item.start_date, type: "buy", units: 0, amount: item.principal }];
  }
  if (item.kind === "rd" && item.monthly_deposit) {
    const end = item.maturity_date && item.maturity_date < date ? item.maturity_date : date;
    const trades = [];
    const day = new Date(`${item.start_date}T00:00:00Z`);
    while (day.toISOString().slice(0, 10) <= end && trades.length < 600) {
      trades.push({ date: day.toISOString().slice(0, 10), type: "buy", units: 0, amount: item.monthly_deposit });
      day.setUTCMonth(day.getUTCMonth() + 1);
    }
    return trades;
  }
  return [];
};

// Which part of the target mix it counts towards: [equity, debt, gold] shares
export const otherInvestmentSplit = (item) => {
  if (item.kind === "sgb") return { equity: 0, debt: 0, gold: 1 };
  if (item.kind === "nps") {
    const equity = Math.min(Math.max(Number(item.equity_share) || 50, 0), 100) / 100;
    return { equity, debt: 1 - equity, gold: 0 };
  }
  return { equity: 0, debt: 1, gold: 0 };
};

// The next date a SIP will be taken, on or after `from`
export const nextSipDate = (day, from = todayKey()) => {
  const [year, month] = from.split("-").map(Number);
  const pad = (value) => String(value).padStart(2, "0");
  const thisMonth = `${year}-${pad(month)}-${pad(day)}`;
  if (thisMonth >= from) return thisMonth;
  const next = new Date(Date.UTC(year, month, day));
  return next.toISOString().slice(0, 10);
};

// SIP instalments that should have been taken in the last 90 days but have no
// matching buy. Only possible when the fund's trades are known.
export const missedSipDates = (fund, date = todayKey()) => {
  const { sip } = fund;
  if (!sip?.active || !sip.day || !fund.trades?.length) return [];

  const buys = fund.trades.filter((trade) => trade.type === "buy").map((trade) => trade.date);
  const lastTrade = buys.sort().at(-1);
  const missed = [];
  const now = new Date(`${date}T00:00:00Z`);

  for (let back = 3; back >= 1; back -= 1) {
    const due = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back + 1, sip.day));
    const dueKey = due.toISOString().slice(0, 10);
    if (dueKey >= date || (sip.start_date && dueKey < sip.start_date)) continue;
    // Trades are only known up to the last statement, so later dates can't be judged
    if (!lastTrade || dueKey > lastTrade) continue;
    const window = (offset) => new Date(due.getTime() + offset * DAY_MS).toISOString().slice(0, 10);
    const paid = buys.some((buy) => buy >= window(-3) && buy <= window(7));
    if (!paid) missed.push(dueKey);
  }
  return missed;
};
