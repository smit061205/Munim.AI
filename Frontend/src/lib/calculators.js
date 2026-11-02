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
