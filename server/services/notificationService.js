import User from "../models/User.js";
import { Transaction } from "../models/Financial.js";
import { AiNote, Notification } from "../models/Planning.js";
import { getOverview } from "./overviewService.js";
import { aiText, canUseAi } from "./aiTaskService.js";
import { todayKey } from "./returnsService.js";
import { appUrl, escapeHtml, isEmailConfigured, layout, sendEmail } from "./emailService.js";

const money = (value) => `₹${Math.round(value || 0).toLocaleString("en-IN")}`;
const DAY_MS = 24 * 60 * 60 * 1000;
const addDays = (date, days) => new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);

// ISO week, e.g. "2026-W45", so the note and digest change each Monday
export const weekKey = (date = new Date()) => {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day - yearStart) / DAY_MS + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

// Creates a notification once; the key stops repeats on later runs
export const notify = async (userId, { key, kind, title, body, href }) => {
  try {
    await Notification.updateOne(
      { user_id: userId, key },
      { $setOnInsert: { user_id: userId, key, kind, title, body, href, read: false, created_at: new Date() } },
      { upsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
};

const UPCOMING_HREF = { bill: "/cash-flow?tab=upcoming", emi: "/accounts", sip: "/portfolio", insurance: "/accounts", subscription: "/cash-flow?tab=recurring" };

// Reminders worked out from the overview: payments due in the next three
// days, unusual activity, missed SIPs, budgets nearly used and goals behind
export const syncNotifications = async (user, overview) => {
  const userId = user._id.toString();
  const data = overview || (await getOverview(user));
  const today = todayKey();
  const soon = addDays(today, 3);
  const month = today.slice(0, 7);
  const jobs = [];

  for (const item of data.upcoming || []) {
    if (item.date > soon) continue;
    jobs.push(notify(userId, {
      key: `due:${item.id}:${item.date}`,
      kind: "bill",
      title: `${item.name} is due ${item.date === today ? "today" : `on ${item.date}`}`,
      body: item.amount ? `${money(item.amount)}` : undefined,
      href: UPCOMING_HREF[item.kind] || "/home",
    }));
  }

  for (const item of data.activity || []) {
    jobs.push(notify(userId, { key: `activity:${item.id}`, kind: "activity", title: item.title, body: item.body, href: "/cash-flow" }));
  }

  for (const sip of data.portfolio?.sips || []) {
    for (const date of sip.missed || []) {
      jobs.push(notify(userId, {
        key: `sip-missed:${sip.id || sip.name}:${date}`,
        kind: "price",
        title: `No SIP instalment found for ${sip.name}`,
        body: `The ${money(sip.amount)} instalment due on ${date} isn't in your records.`,
        href: "/portfolio",
      }));
    }
  }

  for (const budget of data.budgets || []) {
    if (budget.percentUsed < 90) continue;
    jobs.push(notify(userId, {
      key: `budget:${budget.category}:${month}:${budget.percentUsed >= 100 ? "over" : "near"}`,
      kind: "budget",
      title: budget.percentUsed >= 100 ? `${budget.category} budget is used up` : `${budget.category} budget is ${budget.percentUsed}% used`,
      body: `${money(budget.spentAmount)} of ${money(budget.budgetAmount)} this month.`,
      href: "/cash-flow?tab=budgets",
    }));
  }

  for (const goal of data.goals || []) {
    if (goal.status !== "behind") continue;
    jobs.push(notify(userId, {
      key: `goal-behind:${goal.id}:${month}`,
      kind: "goal",
      title: `${goal.name} is behind`,
      body: `About ${money(goal.extraMonthly)} more a month would get it back on track.`,
      href: "/goals",
    }));
  }

  await Promise.all(jobs);
};

// Facts for the weekly note, kept short so the model has little to invent with
const weekFacts = (overview, transactions) => {
  const today = todayKey();
  const weekAgo = addDays(today, -7);
  const lastWeek = transactions.filter((row) => row.type === "expense" && row.date > weekAgo && row.date <= today);
  const spent = lastWeek.reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const byCategory = new Map();
  lastWeek.forEach((row) => byCategory.set(row.category, (byCategory.get(row.category) || 0) + Math.abs(row.amount)));
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const weeklyAverage = (overview.cashflow?.averageMonthlyExpense || 0) / 4.33;

  const lines = [
    `Today is ${today}.`,
    `Spent in the last 7 days: ${money(spent)} (usual week about ${money(weeklyAverage)})`,
    top.length ? `Biggest categories: ${top.map(([name, value]) => `${name} ${money(value)}`).join(", ")}` : "",
    ...(overview.budgets || []).filter((row) => row.percentUsed >= 75).map((row) => `Budget ${row.category}: ${row.percentUsed}% used`),
    ...(overview.upcoming || []).filter((row) => row.date <= addDays(today, 7)).map((row) => `Due ${row.date}: ${row.name} ${money(row.amount)}`),
    ...(overview.activity || []).slice(0, 3).map((row) => `Unusual: ${row.title}`),
    ...(overview.recurring || []).filter((row) => row.priceIncrease).map((row) => `${row.name} went from ${money(row.priceIncrease.from)} to ${money(row.priceIncrease.to)}`),
    ...(overview.goals || []).filter((goal) => goal.status === "behind").map((goal) => `Goal ${goal.name} is behind; needs ${money(goal.extraMonthly)} more a month`),
    overview.portfolio?.returns?.xirr != null ? `Portfolio ${money(overview.portfolio.value)}, yearly return ${overview.portfolio.returns.xirr}%` : "",
  ];
  return { text: lines.filter(Boolean).join("\n"), hasData: transactions.length > 0 };
};

// A short note about the past week, written once per week and kept
export const getWeeklyNote = async (user, { overview, create = true } = {}) => {
  const userId = user._id.toString();
  const week = weekKey();
  const saved = await AiNote.findOne({ user_id: userId, week }).lean();
  if (saved || !create) return saved ? { week, text: saved.text, created_at: saved.created_at } : null;
  if (!(await canUseAi(userId))) return null;

  const data = overview || (await getOverview(user));
  const doc = await Transaction.findOne({ user_id: userId }).select("transactions").lean();
  const { text: facts, hasData } = weekFacts(data, doc?.transactions || []);
  if (!hasData) return null;

  const text = await aiText(
    userId,
    [
      {
        role: "system",
        content:
          "You write a short weekly money note for a user of an Indian personal finance app. Two or three sentences, plain and warm, second person. Mention the one or two things that matter most this week with real figures from the facts, and end with one practical suggestion. No greeting, no headings, no lists. Use only the facts given.",
      },
      { role: "user", content: facts },
    ],
    220,
  );
  if (!text) return null;

  try {
    await AiNote.create({ user_id: userId, week, text });
  } catch (error) {
    // Another request wrote this week's note first
    if (error.code !== 11000) throw error;
  }
  return { week, text, created_at: new Date() };
};

// Monday's email: net worth, last week's spending, what's due and the note
export const sendWeeklyDigest = async (user) => {
  const overview = await getOverview(user);
  const note = await getWeeklyNote(user, { overview }).catch(() => null);
  const today = todayKey();
  const due = (overview.upcoming || []).filter((row) => row.date <= addDays(today, 7)).slice(0, 6);
  const doc = await Transaction.findOne({ user_id: user._id.toString() }).select("transactions").lean();
  const spent = (doc?.transactions || [])
    .filter((row) => row.type === "expense" && row.date > addDays(today, -7) && row.date <= today)
    .reduce((sum, row) => sum + Math.abs(row.amount), 0);

  const paragraphs = [
    `Net worth: <b>${money(overview.netWorth.value)}</b>${overview.netWorth.change != null ? ` (${overview.netWorth.change >= 0 ? "up" : "down"} ${money(Math.abs(overview.netWorth.change))} in a month)` : ""}.`,
    `Spent last week: <b>${money(spent)}</b>.`,
    note ? escapeHtml(note.text) : "",
    due.length
      ? `Due this week:<br>${due.map((row) => `${escapeHtml(row.date)}: ${escapeHtml(row.name)}${row.amount ? `, ${money(row.amount)}` : ""}`).join("<br>")}`
      : "Nothing is due this week.",
  ].filter(Boolean);

  await sendEmail({
    to: user.email,
    subject: `Your week in money: ${money(spent)} spent`,
    html: layout({
      heading: `Hi ${escapeHtml(user.firstName || "there")}, here's your week`,
      paragraphs,
      button: { label: "Open Munim.AI", href: appUrl("/home") },
      footer: `You get this because the weekly summary is on. Turn it off in <a href="${appUrl("/settings?section=preferences")}">Settings</a>.`,
    }),
  });
  return overview;
};

const istHour = () => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(new Date()));
const istWeekday = () => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short" }).format(new Date());

const lastDaily = new Map();
let running = false;

// Once an hour: from 8am IST, each user's reminders are refreshed once a day
// (which also refreshes stale prices), and on Mondays the digest goes out
const runJobs = async () => {
  if (running || istHour() < 8) return;
  running = true;
  const today = todayKey();
  const week = weekKey();
  const monday = istWeekday() === "Mon";

  try {
    const users = await User.find({ email: { $ne: "demo@munim.local" } }).select("email firstName preferences emailVerified digestSentWeek investorProfile").limit(5000);
    for (const user of users) {
      const userId = user._id.toString();
      try {
        let overview = null;
        const wantsDigest = monday && user.preferences?.weeklyDigest !== false && user.digestSentWeek !== week && (user.emailVerified || !isEmailConfigured());
        if (wantsDigest) {
          overview = await sendWeeklyDigest(user);
          user.digestSentWeek = week;
          await user.save();
        }
        if (lastDaily.get(userId) !== today) {
          await syncNotifications(user, overview);
          lastDaily.set(userId, today);
        }
      } catch (error) {
        console.error(`Scheduled jobs failed for ${userId}:`, error.message);
      }
    }
  } finally {
    running = false;
  }
};

export const startScheduler = () => {
  const timer = setInterval(() => runJobs().catch((error) => console.error("Scheduler failed:", error.message)), 60 * 60 * 1000);
  timer.unref();
  setTimeout(() => runJobs().catch(() => {}), 60 * 1000).unref();
};
