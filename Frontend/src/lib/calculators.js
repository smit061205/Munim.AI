const monthlyRate = (annualPercent) =>
  (1 + annualPercent / 100) ** (1 / 12) - 1;

export const finiteOr = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

// Contributions go in at the start of each month, rising once a year
export const projectSip = ({ monthly, years, annualReturn, stepUp = 0 }) => {
  const rate = monthlyRate(annualReturn);
  const rows = [{ year: 0, invested: 0, value: 0 }];
  let value = 0;
  let invested = 0;
  let contribution = monthly;

  for (let year = 1; year <= years; year += 1) {
    for (let month = 0; month < 12; month += 1) {
      value = (value + contribution) * (1 + rate);
      invested += contribution;
    }
    rows.push({ year, invested: Math.round(invested), value: Math.round(value) });
    contribution *= 1 + stepUp / 100;
  }

  return { rows, invested, value, gain: value - invested };
};

// The value of paying 1 at the start of every month
const annuityFactor = (rate, months) =>
  rate === 0 ? months : (((1 + rate) ** months - 1) / rate) * (1 + rate);

export const planRetirement = ({
  age,
  retireAge,
  lifeAge,
  monthlyExpense,
  inflation,
  growthReturn,
  retiredReturn,
  saved,
}) => {
  const yearsToGo = Math.max(retireAge - age, 0);
  const yearsRetired = Math.max(lifeAge - retireAge, 1);
  const firstYearSpend = monthlyExpense * 12 * (1 + inflation / 100) ** yearsToGo;

  // Spending rises with inflation, so retirement years use the real return
  const realReturn = (1 + retiredReturn / 100) / (1 + inflation / 100) - 1;
  const corpus =
    Math.abs(realReturn) < 1e-9
      ? firstYearSpend * yearsRetired
      : (firstYearSpend * (1 - (1 + realReturn) ** -yearsRetired) * (1 + realReturn)) /
        realReturn;

  const projected = saved * (1 + growthReturn / 100) ** yearsToGo;
  const gap = Math.max(corpus - projected, 0);
  const rate = monthlyRate(growthReturn);
  const months = yearsToGo * 12;
  const monthlyNeeded = months > 0 ? gap / annuityFactor(rate, months) : 0;

  const rows = [];
  let value = saved;
  for (let year = 0; year <= yearsToGo; year += 1) {
    rows.push({ year, value: Math.round(value), needed: Math.round(corpus) });
    for (let month = 0; month < 12; month += 1) {
      value = (value + monthlyNeeded) * (1 + rate);
    }
  }

  return { corpus, projected, gap, monthlyNeeded, firstYearSpend, rows, yearsToGo };
};

const repay = (balance, annualRate, payment) => {
  const rate = annualRate / 100 / 12;
  const balances = [balance];
  let remaining = balance;
  let interest = 0;

  while (remaining > 0.5 && balances.length < 1200) {
    const charge = remaining * rate;
    interest += charge;
    remaining = Math.max(remaining + charge - payment, 0);
    balances.push(remaining);
  }
  return { months: balances.length - 1, interest, balances };
};

// Compares where you stand on the day the loan would have ended: either the
// extra went into investments, or the loan ended early and the whole payment
// was invested from then on
export const comparePrepayment = ({
  balance,
  rate,
  emi,
  extra,
  investReturn,
}) => {
  if (emi <= (balance * rate) / 100 / 12) {
    return {
      error: "This EMI doesn't cover the monthly interest, so the loan would never end. Check the amount owed, rate and EMI.",
    };
  }

  const base = repay(balance, rate, emi);
  const faster = repay(balance, rate, emi + extra);
  const growth = monthlyRate(investReturn);

  const invested = extra * annuityFactor(growth, base.months);
  const freedMonths = base.months - faster.months;
  const afterPrepaying = (emi + extra) * annuityFactor(growth, freedMonths);

  const rows = [];
  for (let month = 0; month <= base.months; month += 12) {
    rows.push({
      year: month / 12,
      current: Math.round(base.balances[month] ?? 0),
      prepaying: Math.round(faster.balances[month] ?? 0),
    });
  }

  return {
    monthsSaved: freedMonths,
    interestSaved: base.interest - faster.interest,
    baseMonths: base.months,
    fasterMonths: faster.months,
    invested,
    afterPrepaying,
    betterOption: afterPrepaying >= invested ? "prepay" : "invest",
    difference: Math.abs(afterPrepaying - invested),
    rows,
  };
};

// Pays every debt's minimum each month and puts the extra, plus the minimums
// of debts already cleared, on one target: the highest rate first
// (avalanche) or the smallest balance first (snowball)
const runPayoff = (debts, extra, strategy) => {
  const open = debts.map((debt) => ({ ...debt, remaining: debt.balance, interestPaid: 0, paidOffMonth: null }));
  const totals = [Math.round(open.reduce((sum, debt) => sum + debt.remaining, 0))];
  let month = 0;
  let interest = 0;

  while (open.some((debt) => debt.remaining > 0.5) && month < 600) {
    month += 1;
    let budget = extra + debts.reduce((sum, debt) => sum + debt.minimum, 0);

    for (const debt of open.filter((item) => item.remaining > 0.5)) {
      const charge = (debt.remaining * debt.rate) / 100 / 12;
      debt.remaining += charge;
      debt.interestPaid += charge;
      interest += charge;
    }
    for (const debt of open.filter((item) => item.remaining > 0.5)) {
      const payment = Math.min(debt.minimum, debt.remaining, budget);
      debt.remaining -= payment;
      budget -= payment;
    }
    const targets = open
      .filter((item) => item.remaining > 0.5)
      .sort((a, b) => (strategy === "avalanche" ? b.rate - a.rate : a.remaining - b.remaining));
    for (const debt of targets) {
      if (budget <= 0) break;
      const payment = Math.min(budget, debt.remaining);
      debt.remaining -= payment;
      budget -= payment;
    }
    for (const debt of open) {
      if (debt.remaining <= 0.5 && debt.paidOffMonth === null) {
        debt.remaining = 0;
        debt.paidOffMonth = month;
      }
    }
    totals.push(Math.round(open.reduce((sum, debt) => sum + debt.remaining, 0)));
  }

  return {
    months: month,
    interest,
    finished: month < 600,
    order: [...open]
      .sort((a, b) => (a.paidOffMonth ?? 9999) - (b.paidOffMonth ?? 9999))
      .map((debt) => ({ name: debt.name, paidOffMonth: debt.paidOffMonth, interest: Math.round(debt.interestPaid) })),
    totals,
  };
};

export const planDebtPayoff = ({ debts, extra = 0 }) => {
  const usable = debts
    .map((debt) => ({
      name: debt.name,
      balance: finiteOr(debt.balance),
      rate: finiteOr(debt.rate),
      minimum: finiteOr(debt.minimum),
    }))
    .filter((debt) => debt.balance > 0);
  if (!usable.length) return { error: "Add a debt with a balance to plan its payoff." };

  const monthlyInterest = usable.reduce((sum, debt) => sum + (debt.balance * debt.rate) / 100 / 12, 0);
  const paying = usable.reduce((sum, debt) => sum + debt.minimum, 0) + finiteOr(extra);
  if (paying <= monthlyInterest) {
    return { error: "These payments don't cover the monthly interest, so the debts would never be cleared. Raise the payments or the extra amount." };
  }

  const avalanche = runPayoff(usable, finiteOr(extra), "avalanche");
  const snowball = runPayoff(usable, finiteOr(extra), "snowball");
  const minimumOnly = runPayoff(usable, 0, "avalanche");

  const length = Math.max(avalanche.totals.length, snowball.totals.length);
  const rows = [];
  for (let index = 0; index < length; index += index < 24 ? 1 : 3) {
    rows.push({
      month: index,
      avalanche: avalanche.totals[index] ?? 0,
      snowball: snowball.totals[index] ?? 0,
    });
  }

  return { avalanche, snowball, minimumOnly, rows, saving: snowball.interest - avalanche.interest };
};
