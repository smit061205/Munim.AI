import {
  EPF,
  Investment,
  Liability,
  Transaction,
} from "../models/Financial.js";
import { Insurance, TaxProfile } from "../models/Planning.js";

// Indian income tax as it stood for FY 2025-26 (Budget 2025), used as the
// estimate for later years until rules change. Every figure here is shown to
// the user as an estimate, with a note to confirm with a tax professional.
export const TAX_RULES = {
  label: "FY 2025-26 rules",
  cess: 0.04,
  newRegime: {
    standardDeduction: 75000,
    slabs: [
      [400000, 0],
      [800000, 0.05],
      [1200000, 0.1],
      [1600000, 0.15],
      [2000000, 0.2],
      [2400000, 0.25],
      [Infinity, 0.3],
    ],
    rebateLimit: 1200000,
    maxSurcharge: 0.25,
  },
  oldRegime: {
    standardDeduction: 50000,
    slabs: [
      [250000, 0],
      [500000, 0.05],
      [1000000, 0.2],
      [Infinity, 0.3],
    ],
    rebateLimit: 500000,
    rebateMax: 12500,
    maxSurcharge: 0.37,
    limit80c: 150000,
    limit80dSelf: 25000,
    limit80dSelfSenior: 50000,
    limit80dParents: 25000,
    limit80dParentsSenior: 50000,
    limitNps1b: 50000,
    limitHomeLoanInterest: 200000,
  },
  surcharge: [
    [5000000, 0],
    [10000000, 0.1],
    [20000000, 0.15],
    [50000000, 0.25],
    [Infinity, 0.37],
  ],
  capitalGains: {
    equityShortRate: 0.2,
    equityLongRate: 0.125,
    equityLongExemption: 125000,
    equityLongMonths: 12,
    otherLongRate: 0.125,
    otherLongMonths: 24,
    // Debt funds bought from this date are taxed at slab rates however long they're held
    debtSlabFrom: "2023-04-01",
  },
};

const round = (value) => Math.round(value || 0);

// "2026-27" for any date from April 2026 to March 2027
export const financialYear = (date = new Date().toISOString().slice(0, 10)) => {
  const [year, month] = date.split("-").map(Number);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
};

export const fyRange = (fy) => {
  const start = Number(fy.slice(0, 4));
  return { from: `${start}-04-01`, to: `${start + 1}-03-31` };
};

const monthsHeld = (from, to) => {
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth() - (b.getUTCDate() < a.getUTCDate() ? 1 : 0);
};

// Equity-oriented funds and shares get the equity rates
const taxClass = (holding) => {
  if (holding.kind === "stock") return "equity";
  const category = (holding.category || "").toLowerCase();
  if (/gold|silver/.test(category)) return "gold";
  if (/debt|liquid|bond|gilt|money market|overnight|fixed/.test(category)) return "debt";
  return "equity";
};

// How a gain on one lot is taxed, given when it was bought and sold
const gainType = (cls, boughtOn, soldOn) => {
  const rules = TAX_RULES.capitalGains;
  const months = monthsHeld(boughtOn, soldOn);
  if (cls === "equity") return months > rules.equityLongMonths ? "equityLong" : "equityShort";
  if (cls === "debt" && boughtOn >= rules.debtSlabFrom) return "slab";
  return months > rules.otherLongMonths ? "otherLong" : "slab";
};

// Matches each sale with the oldest units still held (FIFO, as Indian tax
// law requires), returning the realised gains and the lots left over
export const matchLots = (trades) => {
  const lots = [];
  const sales = [];
  for (const trade of [...trades].sort((a, b) => a.date.localeCompare(b.date))) {
    if (trade.type === "buy") {
      if (trade.units > 0) lots.push({ date: trade.date, units: trade.units, cost: trade.amount });
      continue;
    }
    const pricePerUnit = trade.units ? trade.amount / trade.units : 0;
    let units = trade.units;
    while (units > 1e-9 && lots.length) {
      const lot = lots[0];
      const used = Math.min(units, lot.units);
      const cost = (lot.cost * used) / lot.units;
      sales.push({ soldOn: trade.date, boughtOn: lot.date, units: used, cost, proceeds: used * pricePerUnit });
      lot.cost -= cost;
      lot.units -= used;
      units -= used;
      if (lot.units <= 1e-9) lots.shift();
    }
  }
  return { sales, lots };
};

const holdingsOf = (doc) => [
  ...(doc?.portfolio?.stocks || []).map((stock) => ({
    id: stock._id.toString(),
    kind: "stock",
    name: stock.company_name,
    category: "Equity",
    units: stock.quantity,
    value: stock.current_value,
    trades: stock.trades || [],
  })),
  ...(doc?.portfolio?.mutual_funds || []).map((fund) => ({
    id: fund._id.toString(),
    kind: "mutual_fund",
    name: fund.scheme_name,
    category: fund.category,
    units: fund.units,
    value: fund.current_value,
    trades: fund.trades || [],
  })),
];

// Realised gains in a financial year, and what's still unrealised in each
// lot today, for the gains report and harvesting suggestions
export const capitalGains = (doc, fy, today = new Date().toISOString().slice(0, 10)) => {
  const { from, to } = fyRange(fy);
  const totals = { equityShort: 0, equityLong: 0, otherLong: 0, slab: 0 };
  const sales = [];
  const unrealised = [];
  let missingHistory = 0;

  for (const holding of holdingsOf(doc)) {
    if (!holding.trades.length) {
      if (holding.value > 0) missingHistory += 1;
      continue;
    }
    const cls = taxClass(holding);
    const matched = matchLots(holding.trades);

    for (const sale of matched.sales) {
      if (sale.soldOn < from || sale.soldOn > to) continue;
      const type = gainType(cls, sale.boughtOn, sale.soldOn);
      const gain = sale.proceeds - sale.cost;
      totals[type] += gain;
      sales.push({
        holding: holding.name,
        soldOn: sale.soldOn,
        boughtOn: sale.boughtOn,
        units: +sale.units.toFixed(3),
        cost: round(sale.cost),
        proceeds: round(sale.proceeds),
        gain: round(gain),
        type,
      });
    }

    const price = holding.units ? holding.value / holding.units : 0;
    for (const lot of matched.lots) {
      const value = lot.units * price;
      unrealised.push({
        holdingId: holding.id,
        holding: holding.name,
        cls,
        boughtOn: lot.date,
        units: +lot.units.toFixed(3),
        cost: round(lot.cost),
        value: round(value),
        gain: round(value - lot.cost),
        type: gainType(cls, lot.date, today),
      });
    }
  }

  const rules = TAX_RULES.capitalGains;
  // Short-term losses can offset any gain; long-term losses only long-term gains
  let equityShort = totals.equityShort;
  let equityLong = totals.equityLong;
  if (equityShort < 0) {
    equityLong += equityShort;
    equityShort = 0;
  }
  const exemptionUsed = Math.min(Math.max(equityLong, 0), rules.equityLongExemption);
  const taxableEquityLong = Math.max(equityLong - rules.equityLongExemption, 0);

  const tax = {
    equityShort: round(Math.max(equityShort, 0) * rules.equityShortRate),
    equityLong: round(taxableEquityLong * rules.equityLongRate),
    otherLong: round(Math.max(totals.otherLong, 0) * rules.otherLongRate),
  };

  return {
    fy,
    totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, round(value)])),
    exemption: { limit: rules.equityLongExemption, used: round(exemptionUsed), left: round(rules.equityLongExemption - exemptionUsed) },
    tax: { ...tax, total: tax.equityShort + tax.equityLong + tax.otherLong },
    // Debt fund gains are added to income and taxed at the user's slab rate
    slabRatedGains: round(totals.slab),
    sales: sales.sort((a, b) => b.soldOn.localeCompare(a.soldOn)),
    unrealised,
    missingHistory,
  };
};

// Ways to use this year's rules before 31 March: book equity losses to cut
// this year's tax, and book long-term gains within the yearly exemption
export const harvesting = (gains) => {
  const rules = TAX_RULES.capitalGains;
  const equityLots = gains.unrealised.filter((lot) => lot.cls === "equity");

  const byHolding = (lots) => {
    const map = new Map();
    for (const lot of lots) {
      const row = map.get(lot.holdingId) || { holdingId: lot.holdingId, holding: lot.holding, units: 0, cost: 0, value: 0, gain: 0 };
      row.units += lot.units;
      row.cost += lot.cost;
      row.value += lot.value;
      row.gain += lot.gain;
      map.set(lot.holdingId, row);
    }
    return [...map.values()].map((row) => ({ ...row, units: +row.units.toFixed(3) }));
  };

  const losses = byHolding(equityLots.filter((lot) => lot.gain < 0)).sort((a, b) => a.gain - b.gain);
  const lossTotal = -losses.reduce((sum, row) => sum + row.gain, 0);

  // What booking every loss would save against this year's gains
  const shortGain = Math.max(gains.totals.equityShort, 0);
  const longTaxable = Math.max(gains.totals.equityLong - rules.equityLongExemption, 0);
  const offsetShort = Math.min(lossTotal, shortGain);
  const offsetLong = Math.min(lossTotal - offsetShort, longTaxable);
  const lossSaving = round(offsetShort * rules.equityShortRate + offsetLong * rules.equityLongRate);

  // Long-term gains still inside this year's exemption can be booked tax-free
  let room = gains.exemption.left;
  const gainLots = equityLots
    .filter((lot) => lot.type === "equityLong" && lot.gain > 0)
    .sort((a, b) => a.boughtOn.localeCompare(b.boughtOn));
  const gainHarvest = [];
  for (const lot of gainLots) {
    if (room <= 0) break;
    const share = Math.min(1, room / lot.gain);
    gainHarvest.push({
      holding: lot.holding,
      holdingId: lot.holdingId,
      units: +(lot.units * share).toFixed(3),
      value: round(lot.value * share),
      gain: round(lot.gain * share),
    });
    room -= lot.gain * share;
  }
  const harvestable = gainHarvest.reduce((sum, row) => sum + row.gain, 0);

  return {
    losses: losses.map((row) => ({ ...row, cost: round(row.cost), value: round(row.value), gain: round(row.gain) })),
    lossTotal: round(lossTotal),
    lossSaving,
    gainHarvest: byHolding(gainHarvest.map((row) => ({ ...row, cost: row.value - row.gain }))).map((row) => ({
      holdingId: row.holdingId,
      holding: row.holding,
      units: row.units,
      value: round(row.value),
      gain: round(row.gain),
    })),
    harvestable: round(harvestable),
    // Tax saved in a later year by resetting the cost of these units now
    futureSaving: round(harvestable * rules.equityLongRate),
  };
};

const slabTax = (income, slabs) => {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of slabs) {
    if (income <= lower) break;
    tax += (Math.min(income, upper) - lower) * rate;
    lower = upper;
  }
  return tax;
};

const surchargeRate = (income, max) => {
  const row = TAX_RULES.surcharge.find(([upper]) => income <= upper);
  return Math.min(row ? row[1] : 0, max);
};

// Tax on normal income (salary and other income) under one regime
export const regimeTax = (regime, { salary, otherIncome, deductions = 0 }) => {
  const rules = TAX_RULES[regime === "new" ? "newRegime" : "oldRegime"];
  const gross = salary + otherIncome;
  const taxable = Math.max(gross - (salary > 0 ? Math.min(rules.standardDeduction, salary) : 0) - deductions, 0);
  let tax = slabTax(taxable, rules.slabs);

  if (regime === "new") {
    if (taxable <= rules.rebateLimit) {
      tax = 0;
    } else {
      // Marginal relief: just over the limit, tax can't exceed the income above it
      tax = Math.min(tax, taxable - rules.rebateLimit);
    }
  } else if (taxable <= rules.rebateLimit) {
    tax = Math.max(tax - rules.rebateMax, 0);
  }

  const surcharge = tax * surchargeRate(taxable, rules.maxSurcharge);
  const cess = (tax + surcharge) * TAX_RULES.cess;
  return {
    gross: round(gross),
    deductions: round(gross - taxable),
    taxable: round(taxable),
    tax: round(tax),
    surcharge: round(surcharge),
    cess: round(cess),
    total: round(tax + surcharge + cess),
  };
};

const yearlyPremium = (policy) =>
  (policy.premium || 0) * ({ monthly: 12, quarterly: 4, yearly: 1 }[policy.frequency] || 1);

// One year of a loan's interest and principal, from its balance, rate and EMI
const loanYear = (balance, rate, emi) => {
  let remaining = balance;
  let interest = 0;
  let principal = 0;
  for (let month = 0; month < 12 && remaining > 0; month += 1) {
    const charge = (remaining * rate) / 100 / 12;
    const repaid = Math.min(Math.max(emi - charge, 0), remaining);
    interest += charge;
    principal += repaid;
    remaining -= repaid;
  }
  return { interest, principal };
};

// Deductions found in the user's records for the old regime, each with where
// it came from, so the user can see and correct them
export const deductions = ({ epf, funds, policies, debts, profile, fy }) => {
  const rules = TAX_RULES.oldRegime;
  const { from, to } = fyRange(fy);
  const items80c = [];

  if (epf?.employee_contribution) {
    items80c.push({ label: "Your EPF contribution", amount: round(epf.employee_contribution * 12), source: "12 months of your EPF share" });
  }
  const elss = funds
    .filter((fund) => /elss|tax saver/i.test(`${fund.category} ${fund.scheme_name}`))
    .flatMap((fund) => (fund.trades || []).filter((trade) => trade.type === "buy" && trade.date >= from && trade.date <= to))
    .reduce((sum, trade) => sum + trade.amount, 0);
  if (elss) items80c.push({ label: "ELSS investments", amount: round(elss), source: "Purchases this year" });

  const lifePremiums = policies
    .filter((policy) => policy.kind === "term" || policy.kind === "life")
    .reduce((sum, policy) => sum + yearlyPremium(policy), 0);
  if (lifePremiums) items80c.push({ label: "Life insurance premiums", amount: round(lifePremiums), source: "Your term and life policies" });

  let homeLoanInterest = 0;
  for (const debt of debts.filter((row) => row.type === "home_loan" && row.monthly_payment)) {
    const year = loanYear(debt.remaining_balance, debt.interest_rate || 0, debt.monthly_payment);
    homeLoanInterest += year.interest;
    items80c.push({ label: "Home loan principal", amount: round(year.principal), source: "Estimated from your EMI" });
  }
  if (profile?.extra_80c) items80c.push({ label: "Other 80C (PPF, tuition and more)", amount: round(profile.extra_80c), source: "Entered by you" });

  const total80c = items80c.reduce((sum, item) => sum + item.amount, 0);

  const healthSelf = policies.filter((policy) => policy.kind === "health" && !policy.for_parents).reduce((sum, policy) => sum + yearlyPremium(policy), 0);
  const healthParents = policies.filter((policy) => policy.kind === "health" && policy.for_parents).reduce((sum, policy) => sum + yearlyPremium(policy), 0);
  const limitSelf = profile?.self_senior ? rules.limit80dSelfSenior : rules.limit80dSelf;
  const limitParents = profile?.parents_senior === false ? rules.limit80dParents : rules.limit80dParentsSenior;

  const claimed = {
    c80: Math.min(total80c, rules.limit80c),
    d80Self: Math.min(healthSelf, limitSelf),
    d80Parents: Math.min(healthParents, limitParents),
    nps1b: Math.min(profile?.nps_80ccd1b || 0, rules.limitNps1b),
    homeLoanInterest: Math.min(homeLoanInterest, rules.limitHomeLoanInterest),
    hra: profile?.hra_exemption || 0,
  };

  return {
    items80c,
    total80c: round(total80c),
    limit80c: rules.limit80c,
    room80c: round(Math.max(rules.limit80c - total80c, 0)),
    health: { self: round(healthSelf), parents: round(healthParents), limitSelf, limitParents },
    homeLoanInterest: round(homeLoanInterest),
    claimed: Object.fromEntries(Object.entries(claimed).map(([key, value]) => [key, round(value)])),
    total: round(Object.values(claimed).reduce((sum, value) => sum + value, 0)),
  };
};

// Yearly income from salary credits in the last 12 months, as a starting point
const estimateSalary = (transactions) => {
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return round(
    transactions
      .filter((row) => row.type === "income" && row.date >= since && /salary/i.test(`${row.category} ${row.description || ""}`))
      .reduce((sum, row) => sum + Math.abs(row.amount), 0),
  );
};

export const getTaxSummary = async (userId, fy = financialYear()) => {
  const [investmentDoc, epf, policies, liabilityDoc, transactionDoc, profile] = await Promise.all([
    Investment.findOne({ user_id: userId }).lean(),
    EPF.findOne({ user_id: userId }).lean(),
    Insurance.find({ user_id: userId }).lean(),
    Liability.findOne({ user_id: userId }).lean(),
    Transaction.findOne({ user_id: userId }).lean(),
    TaxProfile.findOne({ user_id: userId, fy }).lean(),
  ]);

  const gains = capitalGains(investmentDoc, fy);
  const found = deductions({
    epf,
    funds: investmentDoc?.portfolio?.mutual_funds || [],
    policies,
    debts: liabilityDoc?.liabilities || [],
    profile,
    fy,
  });

  const estimatedSalary = estimateSalary(transactionDoc?.transactions || []);
  const salary = profile?.salary ?? estimatedSalary;
  const otherIncome = (profile?.other_income || 0) + Math.max(gains.slabRatedGains, 0);

  const oldRegime = regimeTax("old", { salary, otherIncome, deductions: found.total });
  const newRegime = regimeTax("new", { salary, otherIncome });
  const better = newRegime.total <= oldRegime.total ? "new" : "old";

  return {
    fy,
    rules: TAX_RULES.label,
    profile: {
      salary,
      salaryIsEstimate: profile?.salary === undefined || profile?.salary === null,
      estimatedSalary,
      other_income: profile?.other_income || 0,
      hra_exemption: profile?.hra_exemption || 0,
      extra_80c: profile?.extra_80c || 0,
      nps_80ccd1b: profile?.nps_80ccd1b || 0,
      self_senior: !!profile?.self_senior,
      parents_senior: profile?.parents_senior !== false,
    },
    regimes: {
      old: oldRegime,
      new: newRegime,
      better,
      saving: Math.abs(oldRegime.total - newRegime.total),
    },
    deductions: found,
    capitalGains: { ...gains, unrealised: undefined },
    harvesting: harvesting(gains),
    // Harvesting only helps before the financial year ends
    daysToYearEnd: Math.max(
      Math.ceil((new Date(`${fyRange(fy).to}T23:59:59Z`).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      0,
    ),
  };
};
