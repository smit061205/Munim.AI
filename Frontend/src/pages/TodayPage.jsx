import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CircleCheck,
  Info,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { useAssistant } from "../context/AssistantContext";
import { api } from "../lib/api";
import { formatDayMonth, formatMoney, formatPercent } from "../lib/format";
import Loaded from "../components/Loaded";
import { NetWorthChart } from "../components/charts";
import { Button, Card, Delta, Progress, useToast } from "../components/ui";

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const daysUntil = (date) => Math.round((new Date(date) - new Date(new Date().toDateString())) / 86400000);

const whenLabel = (date) => {
  const days = daysUntil(date);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  return formatDayMonth(date);
};

const KIND = { bill: "Bill", emi: "EMI", sip: "SIP", insurance: "Premium", subscription: "Subscription" };

const AskLink = ({ question, label = "Ask Munim" }) => {
  const { ask } = useAssistant();
  return (
    <button
      onClick={() => ask(question)}
      className="no-print inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors"
    >
      <MessageCircle size={14} /> {label}
    </button>
  );
};

const HealthRing = ({ score }) => {
  const radius = 26;
  const length = 2 * Math.PI * radius;
  const tone = score >= 70 ? "var(--color-gain)" : score >= 45 ? "var(--color-accent)" : "var(--color-warn)";
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="-rotate-90">
      <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--color-wash)" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={radius}
        fill="none"
        stroke={tone}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - score / 100)}
      />
    </svg>
  );
};

const Hero = ({ data }) => {
  const { netWorth, health } = data;
  const [showFactors, setShowFactors] = useState(false);

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm text-muted">Net worth</p>
          <p className="figure tnum text-[44px] sm:text-[60px] mt-2">{formatMoney(netWorth.value)}</p>
          <p className="mt-3 text-[15px]">
            {netWorth.change === null ? (
              <span className="text-muted">Your trend appears after 30 days of history.</span>
            ) : (
              <>
                <Delta value={netWorth.change} percent={netWorth.changePercent} />{" "}
                <span className="text-muted">over the last 30 days</span>
              </>
            )}
          </p>
        </div>
        {health.score !== null && (
          <div className="md:w-64 shrink-0">
            <button
              onClick={() => setShowFactors(!showFactors)}
              aria-expanded={showFactors}
              className="w-full flex items-center gap-3 p-2 -m-2 rounded-xl hover:bg-wash text-left"
            >
              <span className="relative shrink-0">
                <HealthRing score={health.score} />
                <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold tnum">{health.score}</span>
              </span>
              <span>
                <span className="block font-medium">Financial health</span>
                <span className="block text-sm text-muted">{showFactors ? "Hide what it's made of" : "See what it's made of"}</span>
              </span>
            </button>
            {showFactors && (
              <ul className="space-y-3 mt-4">
                {health.factors.map((factor) => (
                  <li key={factor.key}>
                    <div className="flex justify-between gap-3 text-sm mb-1">
                      <span>{factor.label}</span>
                      <span className="text-muted text-right">{factor.detail}</span>
                    </div>
                    <Progress value={factor.score} label={factor.label} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="mt-6">
        <NetWorthChart history={netWorth.history} />
      </div>
    </Card>
  );
};

// Everything that wants the user's attention, most urgent first
const attentionItems = (data) => {
  const items = [];
  for (const budget of data.budgets || []) {
    if (budget.status === "over-budget") {
      items.push({
        id: `budget-${budget.id}`,
        tone: "loss",
        title: `${budget.category} is over budget`,
        body: `${formatMoney(budget.spentAmount)} spent of ${formatMoney(budget.budgetAmount)}.`,
        href: "/money/budgets",
        ask: `My ${budget.category} budget is over. Where did the money go and how do I get back on track?`,
      });
    }
  }
  for (const item of data.upcoming || []) {
    if (daysUntil(item.date) <= 3) {
      items.push({
        id: `due-${item.id}`,
        tone: "warn",
        icon: CalendarClock,
        title: `${item.name} ${daysUntil(item.date) <= 0 ? "is due today" : `is due ${whenLabel(item.date).toLowerCase()}`}`,
        body: `${KIND[item.kind] || "Payment"}${item.amount ? ` of ${formatMoney(item.amount)}` : ""}.`,
        href: "/money/bills",
      });
    }
  }
  for (const insight of data.insights || []) {
    items.push({
      id: `insight-${insight.id}`,
      tone: insight.severity === "warning" ? "warn" : "info",
      title: insight.title,
      body: insight.body,
      href: insight.href,
      ask: `${insight.title}. ${insight.body} What should I do about this?`,
    });
  }
  const order = { loss: 0, warn: 1, info: 2 };
  return items.sort((a, b) => order[a.tone] - order[b.tone]);
};

const TONE = {
  loss: { icon: AlertTriangle, className: "text-loss bg-loss-soft" },
  warn: { icon: AlertTriangle, className: "text-warn bg-warn-soft" },
  info: { icon: Info, className: "text-accent bg-accent-soft" },
};

const Attention = ({ data }) => {
  const [all, setAll] = useState(false);
  const items = attentionItems(data);
  const shown = all ? items : items.slice(0, 4);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="font-semibold">Needs your attention</h2>
        {items.length > 0 && <span className="text-sm text-muted tnum">{items.length}</span>}
      </div>
      {items.length === 0 ? (
        <div className="px-5 pb-6 flex items-center gap-3 text-muted">
          <CircleCheck size={18} className="text-gain" />
          Nothing needs you right now.
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {shown.map((item) => {
            const tone = TONE[item.tone];
            const Icon = item.icon || tone.icon;
            return (
              <li key={item.id} className="flex gap-3 px-5 py-3.5">
                <span className={`w-8 h-8 shrink-0 rounded-lg inline-flex items-center justify-center ${tone.className}`}>
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <Link to={item.href || "/today"} className="font-medium hover:underline">{item.title}</Link>
                  <p className="text-sm text-muted">{item.body}</p>
                  {item.ask && (
                    <div className="mt-1">
                      <AskLink question={item.ask} label="Ask what to do" />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 4 && (
        <button onClick={() => setAll(!all)} className="mt-auto px-5 py-3 border-t border-line text-sm text-muted hover:text-ink text-left">
          {all ? "Show fewer" : `Show ${items.length - 4} more`}
        </button>
      )}
    </Card>
  );
};

const WeeklyNote = () => {
  const [note, setNote] = useState(undefined);

  useEffect(() => {
    api("/notifications/weekly-note")
      .then(({ data }) => setNote(data))
      .catch(() => setNote(null));
  }, []);

  const points = note?.text
    ? note.text.split(/(?<=[.!?])\s+(?=[A-Z₹])/).map((point) => point.trim()).filter(Boolean)
    : [];

  return (
    <Card className="p-5 bg-accent-soft/40">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-accent" />
        <h2 className="font-semibold">Your week in brief</h2>
      </div>
      {note === undefined ? (
        <div className="space-y-2" aria-label="Loading">
          <div className="h-3 rounded bg-wash animate-pulse" />
          <div className="h-3 rounded bg-wash animate-pulse w-5/6" />
          <div className="h-3 rounded bg-wash animate-pulse w-4/6" />
        </div>
      ) : note === null ? (
        <p className="text-muted">The weekly summary isn't available right now. It's written fresh each Monday.</p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {points.map((point) => (
              <li key={point} className="flex gap-2.5 text-[15px] leading-snug">
                <span className="mt-2 w-1 h-1 rounded-full bg-accent shrink-0" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <AskLink question={`About this week's summary: "${note.text}" What should I do first?`} label="What should I do first?" />
          </div>
        </>
      )}
    </Card>
  );
};

const Summary = ({ to, title, children, footer }) => (
  <Link to={to} className="group block">
    <Card className="p-5 h-full flex flex-col transition-colors group-hover:border-line-strong">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">{title}</h2>
        <ArrowUpRight size={16} className="text-faint group-hover:text-accent transition-colors" />
      </div>
      <div className="flex-1">{children}</div>
      {footer && <div className="mt-4 pt-3 border-t border-line text-sm text-muted">{footer}</div>}
    </Card>
  </Link>
);

const MonthSummary = ({ cashflow, spending }) => {
  const { income, expense } = cashflow.thisMonth;
  const spentShare = income > 0 ? Math.min((expense / income) * 100, 100) : 0;
  return (
    <Summary to="/money" title="This month" footer={`Saving ${cashflow.savingsRate}% of income on average`}>
      <p className="text-[28px] font-semibold tnum tracking-tight leading-none">{formatMoney(expense)}</p>
      <p className="text-sm text-muted mt-1.5">spent of {formatMoney(income)} income</p>
      <div className="mt-4">
        <Progress value={spentShare} tone={spentShare > 90 ? "loss" : "accent"} label="Share of income spent" />
      </div>
      {spending.length > 0 && (
        <p className="text-sm mt-3">
          Most on <span className="font-medium">{spending[0].category}</span>{" "}
          <span className="text-muted tnum">({formatMoney(spending[0].amount)} in 90 days)</span>
        </p>
      )}
    </Summary>
  );
};

const WealthSummary = ({ portfolio }) => (
  <Summary
    to="/wealth/investments"
    title="Investments"
    footer={portfolio.drift >= 10 ? `${portfolio.drift} points away from your target mix` : "Close to your target mix"}
  >
    <p className="text-[28px] font-semibold tnum tracking-tight leading-none">{formatMoney(portfolio.value)}</p>
    <p className="text-sm mt-1.5">
      {portfolio.invested > 0 ? <Delta value={portfolio.gain} /> : <span className="text-muted">Add buy prices to see gains</span>}
      {portfolio.invested > 0 && <span className="text-muted"> overall</span>}
    </p>
    {portfolio.returns?.xirr !== null && portfolio.returns?.xirr !== undefined && (
      <dl className="grid grid-cols-2 gap-3 mt-4 text-sm">
        <div>
          <dt className="text-muted">Yearly return</dt>
          <dd className="tnum font-medium">{formatPercent(portfolio.returns.xirr)}</dd>
        </div>
        {portfolio.returns.benchmark && (
          <div>
            <dt className="text-muted">Nifty 50</dt>
            <dd className="tnum font-medium">{formatPercent(portfolio.returns.benchmark.xirr)}</dd>
          </div>
        )}
      </dl>
    )}
  </Summary>
);

const GoalsSummary = ({ goals }) => (
  <Summary to="/plan" title="Goals" footer={goals.length ? `${goals.filter((goal) => goal.status === "on-track").length} of ${goals.length} on track` : null}>
    {goals.length ? (
      <ul className="space-y-4">
        {goals.slice(0, 3).map((goal) => (
          <li key={goal.id}>
            <div className="flex justify-between gap-3 text-sm mb-1.5">
              <span className="truncate font-medium">{goal.name}</span>
              <span className="text-muted tnum shrink-0">{Math.round(goal.progress)}%</span>
            </div>
            <Progress value={goal.progress} tone={goal.status === "behind" ? "loss" : goal.status === "on-track" ? "gain" : "accent"} label={goal.name} />
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-muted">Set a goal to see what you need to save each month.</p>
    )}
  </Summary>
);

const ComingUp = ({ upcoming }) => {
  const soon = upcoming.slice(0, 5);
  return (
    <Card>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="font-semibold">Coming up</h2>
        <Link to="/money/bills" className="text-sm text-muted hover:text-ink">All bills</Link>
      </div>
      {soon.length ? (
        <ul className="divide-y divide-line border-t border-line">
          {soon.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-20 shrink-0 text-sm text-muted whitespace-nowrap">{whenLabel(item.date)}</span>
                <span className="truncate">{item.name}</span>
              </div>
              <span className="tnum shrink-0">{item.amount ? formatMoney(item.amount) : ""}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 pb-5 text-muted">Nothing due in the next five weeks.</p>
      )}
    </Card>
  );
};

const RecentActivity = ({ transactions }) => (
  <Card>
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <h2 className="font-semibold">Recent transactions</h2>
      <Link to="/money" className="text-sm text-muted hover:text-ink">All transactions</Link>
    </div>
    {transactions.length ? (
      <ul className="divide-y divide-line border-t border-line">
        {transactions.slice(0, 5).map((item) => (
          <li key={item.id || item._id} className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate">{item.description || item.category}</p>
              <p className="text-sm text-muted">{item.category}</p>
            </div>
            <p className={`tnum shrink-0 ${item.type === "income" ? "text-gain" : ""}`}>
              {item.type === "income" ? "+" : "−"}
              {formatMoney(Math.abs(item.amount))}
            </p>
          </li>
        ))}
      </ul>
    ) : (
      <p className="px-5 pb-5 text-muted">No transactions yet.</p>
    )}
  </Card>
);

const SETUP_STEPS = [
  { to: "/import", title: "Import your statements", body: "A CAS for mutual funds, an NSDL or CDSL statement for shares, and a bank statement for spending." },
  { to: "/wealth/accounts", title: "Add bank balances and loans", body: "These complete your net worth and let Munim warn you before EMIs are due." },
  { to: "/plan?new=goal", title: "Set your first goal", body: "A house, a car or retirement. See what it needs each month." },
];

const Setup = () => {
  const { user, reloadUser } = useAuth();
  const { refresh } = useData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const loadSample = async () => {
    setBusy(true);
    try {
      await api("/wealth/sample-data", { method: "POST" });
      await Promise.all([reloadUser(), refresh()]);
      toast.success("Sample data added");
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  const { equity, debt, gold } = user.investorProfile.allocation;

  return (
    <div className="max-w-3xl pt-6">
      <h1 className="font-display text-[36px] leading-tight">Welcome, {user.firstName}.</h1>
      <p className="text-lg text-muted mt-2 max-w-xl">
        Your target mix is {equity}% equity, {debt}% debt and {gold}% gold. Three steps and you'll see how you compare.
      </p>
      <ol className="mt-10 space-y-3">
        {SETUP_STEPS.map((step, index) => (
          <li key={step.to}>
            <Link to={step.to} className="group flex items-start gap-4 p-5 rounded-2xl bg-surface border border-line hover:border-line-strong shadow-[var(--shadow-raise)] transition-colors">
              <span className="w-8 h-8 shrink-0 rounded-full bg-accent-soft text-accent font-semibold inline-flex items-center justify-center tnum">{index + 1}</span>
              <span className="flex-1">
                <span className="block font-medium">{step.title}</span>
                <span className="block text-muted mt-0.5">{step.body}</span>
              </span>
              <ArrowRight size={18} className="mt-1 text-faint group-hover:text-accent transition-colors" />
            </Link>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={busy} onClick={loadSample}>
          {busy ? "Adding sample data..." : "Explore with sample data"}
        </Button>
        <p className="text-sm text-muted">Made-up numbers you can remove any time from Settings.</p>
      </div>
    </div>
  );
};

export default function TodayPage() {
  const { user } = useAuth();
  const date = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Loaded>
      {(data) =>
        data.isEmpty ? (
          <Setup />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2 pt-2 pb-3">
              <h1 className="font-display text-[28px] leading-tight">
                {greeting()}, {user.firstName}
              </h1>
              <p className="text-muted">{date}</p>
            </div>

            <Hero data={data} />

            <div className="grid @3xl:grid-cols-5 gap-4">
              <div className="@3xl:col-span-3">
                <Attention data={data} />
              </div>
              <div className="@3xl:col-span-2">
                <WeeklyNote />
              </div>
            </div>

            <div className="grid @2xl:grid-cols-3 gap-4">
              <MonthSummary cashflow={data.cashflow} spending={data.spending} />
              <WealthSummary portfolio={data.portfolio} />
              <GoalsSummary goals={data.goals} />
            </div>

            <div className="grid @3xl:grid-cols-2 gap-4">
              <ComingUp upcoming={data.upcoming} />
              <RecentActivity transactions={data.recentTransactions} />
            </div>
          </div>
        )
      }
    </Loaded>
  );
}
