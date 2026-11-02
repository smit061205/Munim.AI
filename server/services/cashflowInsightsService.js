// Recurring payments, unusual activity and the upcoming payments calendar,
// all worked out from the user's own records

const DAY_MS = 24 * 60 * 60 * 1000;
const RECURRING_LOOKBACK_DAYS = 400;
const DUPLICATE_WINDOW_DAYS = 3;
const UPCOMING_DAYS = 35;

const toTime = (date) => new Date(`${date}T00:00:00Z`).getTime();
const toKey = (time) => new Date(time).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((toTime(b) - toTime(a)) / DAY_MS);
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const todayKey = () => new Date().toISOString().slice(0, 10);

const SUBSCRIPTIONS =
  /netflix|spotify|prime|hotstar|disney|youtube|apple|icloud|google one|zee5|sonyliv|jiocinema|gaana|audible|kindle|cult\.?fit|gym|swiggy one|zomato gold|linkedin|notion|chatgpt|openai|adobe|microsoft|office 365|canva|dropbox|broadband|fibernet|airtel|jio|vodafone|\bvi\b|tata play|dth|newspaper/;

// "UPI/123456/SWIGGY ORDER 8812" and "Swiggy" should be the same merchant
export const merchantOf = (transaction) =>
  String(transaction.description || transaction.category || "")
    .toLowerCase()
    .replace(/^(upi|pos|neft|imps|ach|nach|ecs|bil|billpay|card)[\s/:-]+/g, "")
    .replace(/[0-9]{3,}/g, " ")
    .replace(/[^a-z& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ") || "other";

const CADENCES = [
  { key: "weekly", days: 7, min: 5, max: 9 },
  { key: "monthly", days: 30, min: 25, max: 36 },
  { key: "quarterly", days: 91, min: 82, max: 100 },
  { key: "yearly", days: 365, min: 340, max: 390 },
];

const MONTHLY_FACTOR = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

// Payments that repeat on a regular schedule at a similar amount
export const findRecurring = (transactions, date = todayKey()) => {
  const since = toKey(toTime(date) - RECURRING_LOOKBACK_DAYS * DAY_MS);
  const groups = new Map();

  for (const transaction of transactions) {
    if (transaction.type !== "expense" || transaction.date < since) continue;
    const key = merchantOf(transaction);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(transaction);
  }

  const recurring = [];
  for (const [merchant, rows] of groups) {
    if (rows.length < 3) continue;
    rows.sort((a, b) => a.date.localeCompare(b.date));

    // Several payments on one day (a busy shopping day) aren't a schedule
    const days = [...new Set(rows.map((row) => row.date))];
    if (days.length < 3) continue;
    const gaps = days.slice(1).map((day, index) => daysBetween(days[index], day));
    const gap = median(gaps);
    const cadence = CADENCES.find((option) => gap >= option.min && gap <= option.max);
    if (!cadence) continue;

    // Most gaps should fit the schedule, or it's just a frequent merchant
    const regular = gaps.filter((value) => value >= cadence.min && value <= cadence.max).length;
    if (regular / gaps.length < 0.7) continue;

    const amounts = rows.map((row) => Math.abs(row.amount));
    const typical = median(amounts.slice(0, -1));
    const last = amounts[amounts.length - 1];
    const spread = Math.max(...amounts.slice(-4)) / Math.min(...amounts.slice(-4));
    if (spread > 1.6) continue;

    const lastDate = rows[rows.length - 1].date;
    const nextDate = toKey(toTime(lastDate) + cadence.days * DAY_MS);
    // A schedule that stopped two cycles ago has probably ended
    const active = daysBetween(lastDate, date) <= cadence.max * 1.6;

    const name = rows[rows.length - 1].description || rows[rows.length - 1].category;
    const category = rows[rows.length - 1].category;
    recurring.push({
      key: merchant,
      name,
      category,
      cadence: cadence.key,
      amount: Math.round(last),
      monthlyCost: Math.round(last * MONTHLY_FACTOR[cadence.key]),
      lastDate,
      nextDate,
      count: rows.length,
      active,
      subscription:
        SUBSCRIPTIONS.test(`${merchant} ${name.toLowerCase()}`) ||
        /subscription|entertainment|ott/i.test(category),
      // Went up by at least 5% and ₹20 against what it used to be
      priceIncrease:
        last > typical * 1.05 && last - typical >= 20
          ? { from: Math.round(typical), to: Math.round(last) }
          : null,
    });
  }

  return recurring.sort((a, b) => b.monthlyCost - a.monthlyCost);
};

const isRoutine = (transaction) =>
  /rent|emi|investment|sip|salary|loan|insurance|tax/i.test(transaction.category);

// Charges worth a second look: duplicates, price rises, spending spikes and
// unusually large payments. Each has a stable id so it can be dismissed.
export const findUnusualActivity = (transactions, recurring, date = todayKey()) => {
  const items = [];
  const recent = transactions
    .filter((row) => row.type === "expense" && daysBetween(row.date, date) <= 45 && row.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date));

  // The same amount to the same merchant within a few days
  for (let index = 0; index < recent.length; index += 1) {
    for (let next = index + 1; next < recent.length; next += 1) {
      const a = recent[index];
      const b = recent[next];
      if (daysBetween(a.date, b.date) > DUPLICATE_WINDOW_DAYS) break;
      if (Math.abs(a.amount) !== Math.abs(b.amount) || merchantOf(a) !== merchantOf(b)) continue;
      if (Math.abs(a.amount) < 100 || isRoutine(a)) continue;
      items.push({
        id: `duplicate-${a.id || a.date}-${b.id || b.date}`,
        kind: "duplicate",
        title: `Possible duplicate charge from ${a.description || a.category}`,
        body: `₹${Math.abs(a.amount).toLocaleString("en-IN")} on ${a.date} and again on ${b.date}.`,
        href: `/cash-flow?q=${encodeURIComponent(a.description || a.category)}`,
      });
    }
  }

  for (const item of recurring.filter((row) => row.priceIncrease && row.active)) {
    if (daysBetween(item.lastDate, date) > 45) continue;
    items.push({
      id: `price-${item.key}-${item.lastDate}`,
      kind: "price",
      title: `${item.name} now costs more`,
      body: `₹${item.priceIncrease.from.toLocaleString("en-IN")} went up to ₹${item.priceIncrease.to.toLocaleString("en-IN")} a ${item.cadence === "monthly" ? "month" : item.cadence.replace(/ly$/, "")}.`,
      href: "/cash-flow?tab=recurring",
    });
  }

  // A category this month well above its usual month
  const month = date.slice(0, 7);
  const previousMonths = [1, 2, 3].map((back) => {
    const day = new Date(`${month}-01T00:00:00Z`);
    day.setUTCMonth(day.getUTCMonth() - back);
    return day.toISOString().slice(0, 7);
  });
  const totals = new Map();
  for (const row of transactions) {
    if (row.type !== "expense" || isRoutine(row)) continue;
    const key = row.date.slice(0, 7);
    if (key !== month && !previousMonths.includes(key)) continue;
    const category = totals.get(row.category) || { now: 0, before: 0 };
    if (key === month) category.now += Math.abs(row.amount);
    else category.before += Math.abs(row.amount) / 3;
    totals.set(row.category, category);
  }
  for (const [category, { now, before }] of totals) {
    if (before > 0 && now > before * 1.5 && now - before >= 3000) {
      items.push({
        id: `spike-${category}-${month}`,
        kind: "spike",
        title: `${category} spending is high this month`,
        body: `₹${Math.round(now).toLocaleString("en-IN")} so far, against about ₹${Math.round(before).toLocaleString("en-IN")} in a usual month.`,
        href: `/cash-flow?q=${encodeURIComponent(category)}`,
      });
    }
  }

  // One payment far bigger than this person's usual ones
  const sixMonths = transactions
    .filter((row) => row.type === "expense" && !isRoutine(row) && daysBetween(row.date, date) <= 180)
    .map((row) => Math.abs(row.amount))
    .sort((a, b) => a - b);
  if (sixMonths.length >= 20) {
    const usualLarge = sixMonths[Math.floor(sixMonths.length * 0.9)];
    const recurringKeys = new Set(recurring.map((row) => row.key));
    for (const row of recent) {
      if (daysBetween(row.date, date) > 14 || isRoutine(row) || recurringKeys.has(merchantOf(row))) continue;
      if (Math.abs(row.amount) >= Math.max(usualLarge * 3, 10000)) {
        items.push({
          id: `large-${row.id || row.date}`,
          kind: "large",
          title: `A large payment to ${row.description || row.category}`,
          body: `₹${Math.abs(row.amount).toLocaleString("en-IN")} on ${row.date}, well above your usual spending.`,
          href: `/cash-flow?q=${encodeURIComponent(row.description || row.category)}`,
        });
      }
    }
  }

  return items;
};

const pad = (value) => String(value).padStart(2, "0");

// The next date on or after `from` that falls on `day` of the month, clamped
// to the month's last day (a bill due on the 31st falls on 30 November)
const nextMonthlyDate = (day, from, monthStep = 1, month = null) => {
  const start = new Date(`${from}T00:00:00Z`);
  for (let offset = 0; offset < 24; offset += 1) {
    const year = start.getUTCFullYear();
    const index = start.getUTCMonth() + offset;
    const monthNumber = ((index % 12) + 12) % 12 + 1;
    if (month && monthStep > 1 && (monthNumber - month + 12) % monthStep !== 0) continue;
    const lastDay = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
    const candidate = new Date(Date.UTC(year, index, Math.min(day, lastDay)));
    const key = candidate.toISOString().slice(0, 10);
    if (key >= from) return key;
  }
  return null;
};

// Everything due in the next few weeks: bills, EMIs, SIPs, insurance premiums
// and the subscriptions spotted in the user's spending
export const buildUpcoming = ({ bills, debts, funds, policies, recurring }, date = todayKey()) => {
  const until = toKey(toTime(date) + UPCOMING_DAYS * DAY_MS);
  const items = [];
  const add = (item) => {
    if (item.date && item.date >= date && item.date <= until) items.push(item);
  };

  for (const bill of bills.filter((row) => row.active)) {
    const step = { monthly: 1, quarterly: 3, yearly: 12 }[bill.frequency] || 1;
    add({
      id: `bill-${bill._id}`,
      kind: "bill",
      name: bill.name,
      amount: bill.amount,
      date: nextMonthlyDate(bill.due_day, date, step, bill.due_month),
      href: "/cash-flow?tab=upcoming",
    });
  }

  for (const debt of debts.filter((row) => row.due_day && row.monthly_payment)) {
    add({
      id: `emi-${debt.id}`,
      kind: "emi",
      name: debt.type === "credit_card" ? "Credit card payment" : `${debt.type.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())} EMI`,
      amount: debt.monthly_payment,
      date: nextMonthlyDate(debt.due_day, date),
      href: "/accounts",
    });
  }

  for (const fund of funds.filter((row) => row.sip?.active && row.sip.day)) {
    add({
      id: `sip-${fund._id}`,
      kind: "sip",
      name: `SIP: ${fund.scheme_name}`,
      amount: fund.sip.amount,
      date: nextMonthlyDate(fund.sip.day, date),
      href: "/portfolio",
    });
  }

  for (const policy of policies.filter((row) => row.renewal_date && row.premium)) {
    let due = policy.renewal_date;
    const step = { monthly: 1, quarterly: 3, yearly: 12 }[policy.frequency] || 12;
    // Move a past renewal date forward by whole payment periods
    while (due < date) {
      const next = new Date(`${due}T00:00:00Z`);
      next.setUTCMonth(next.getUTCMonth() + step);
      due = next.toISOString().slice(0, 10);
    }
    add({
      id: `insurance-${policy._id}`,
      kind: "insurance",
      name: `${policy.name} premium`,
      amount: policy.premium,
      date: due,
      href: "/accounts",
    });
  }

  // Subscriptions the user hasn't already added as a bill
  const billNames = bills.map((bill) => bill.name.toLowerCase());
  for (const item of recurring.filter((row) => row.active && row.subscription)) {
    if (billNames.some((name) => name.includes(item.key) || item.key.includes(name))) continue;
    let next = item.nextDate;
    const cadenceDays = CADENCES.find((option) => option.key === item.cadence).days;
    while (next < date) next = toKey(toTime(next) + cadenceDays * DAY_MS);
    add({
      id: `subscription-${item.key}`,
      kind: "subscription",
      name: item.name,
      amount: item.amount,
      date: next,
      href: "/cash-flow?tab=recurring",
      expected: true,
    });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
};

export { nextMonthlyDate, pad };
