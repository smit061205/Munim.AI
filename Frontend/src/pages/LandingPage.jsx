import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/AppLayout";
import {
  AllocationCompare,
  ASSET_CLASS_COLORS,
  CashFlowChart,
  GrowthChart,
  NetWorthChart,
  SERIES,
  SpendingBars,
} from "../components/charts";
import { Progress, Tabs } from "../components/ui";
import { projectSip } from "../lib/calculators";
import { formatCompact, formatMoney } from "../lib/format";

// The same five mixes the full questionnaire can arrive at
const PROFILES = [
  { label: "Conservative", equity: 15, debt: 75, gold: 10, body: "Protecting what you have comes first, and steadiness matters more than growth." },
  { label: "Moderately conservative", equity: 30, debt: 60, gold: 10, body: "Mostly stable, with a modest share of growth assets to stay ahead of inflation." },
  { label: "Balanced", equity: 50, debt: 40, gold: 10, body: "An even split between growth and stability, for people comfortable with some ups and downs." },
  { label: "Growth", equity: 70, debt: 22, gold: 8, body: "Long-term growth comes first, and you can sit through sharp falls along the way." },
  { label: "Aggressive", equity: 85, debt: 10, gold: 5, body: "Mostly equity, for long horizons and a real tolerance for large swings." },
];

const HORIZONS = [
  { label: "Within 3 years", score: 0 },
  { label: "3 to 5 years", score: 1 },
  { label: "5 to 10 years", score: 2 },
  { label: "Over 10 years", score: 3 },
];

const REACTIONS = [
  { label: "Sell to stop the fall", score: 0 },
  { label: "Hold and wait", score: 1 },
  { label: "Invest more", score: 2 },
];

const CLASSES = [
  { key: "equity", label: "Equity" },
  { key: "debt", label: "Debt" },
  { key: "gold", label: "Gold" },
];

const Choice = ({ legend, options, value, onChange }) => (
  <fieldset>
    <legend className="text-sm text-muted mb-2">{legend}</legend>
    <div className="flex flex-wrap gap-1.5">
      {options.map((option, index) => (
        <button
          key={option.label}
          aria-pressed={value === index}
          onClick={() => onChange(index)}
          className={`px-3 h-9 rounded-lg border text-sm transition-colors ${
            value === index
              ? "bg-accent border-accent text-canvas"
              : "bg-surface border-line-strong hover:bg-wash"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </fieldset>
);

// A money-free taste of the questionnaire, so the first thing a visitor does
// here is the thing the product is about
const MixFinder = () => {
  const [horizon, setHorizon] = useState(2);
  const [reaction, setReaction] = useState(1);

  const profile = useMemo(() => {
    const score = HORIZONS[horizon].score + REACTIONS[reaction].score;
    // Money needed soon stays cautious, whatever the appetite for risk
    const capped = horizon === 0 ? Math.min(score, 1) : score;
    return PROFILES[Math.min(capped, PROFILES.length - 1)];
  }, [horizon, reaction]);

  return (
    <div className="bg-surface border border-line rounded-xl p-6">
      <div className="space-y-5">
        <Choice
          legend="When will you need this money?"
          options={HORIZONS}
          value={horizon}
          onChange={setHorizon}
        />
        <Choice
          legend="If your investments fell 20% in a month, you would"
          options={REACTIONS}
          value={reaction}
          onChange={setReaction}
        />
      </div>

      <div className="border-t border-line mt-6 pt-5" aria-live="polite">
        <p className="text-sm text-muted">A mix like yours</p>
        <p className="font-display text-4xl leading-tight mt-0.5 mb-4">
          {profile.label}
        </p>
        <div className="flex gap-0.5 h-3 mb-3" aria-hidden="true">
          {CLASSES.map(({ key }) => (
            <div
              key={key}
              className="first:rounded-l last:rounded-r transition-[width] duration-500 ease-out"
              style={{
                width: `${profile[key]}%`,
                background: ASSET_CLASS_COLORS[key],
              }}
            />
          ))}
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-sm text-muted text-left">
              <th className="font-normal pb-1">In every ₹10 lakh</th>
              <th className="font-normal pb-1 text-right">Share</th>
              <th className="font-normal pb-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {CLASSES.map(({ key, label }) => (
              <tr key={key} className="border-t border-line">
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ background: ASSET_CLASS_COLORS[key] }}
                    />
                    {label}
                  </span>
                </td>
                <td className="py-2 text-right tnum">{profile[key]}%</td>
                <td className="py-2 text-right tnum">
                  {formatMoney(profile[key] * 10000)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Example figures run up to the current month, so the page never looks stale
const monthsBack = (count) =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - (count - 1 - index));
    return date.toISOString().slice(0, 7);
  });

const EXAMPLE_HISTORY = monthsBack(12).map((month, index) => ({
  date: `${month}-01`,
  value: [64.2, 65, 65.9, 65.1, 66.4, 67.9, 68.5, 69.3, 70.6, 71.2, 72, 72.8][index] * 1e5,
}));

const EXAMPLE_ALLOCATION = [
  { key: "equity", label: "Equity", value: 1075000, percent: 43, target: 50 },
  { key: "debt", label: "Debt", value: 1350000, percent: 54, target: 40 },
  { key: "gold", label: "Gold", value: 75000, percent: 3, target: 10 },
];

const EXAMPLE_MONTHS = monthsBack(12).map((month, index) => {
  const income = 165000 + (index % 4 === 2 ? 16000 : 0);
  const expense = 118000 + (index * 3700) % 11000;
  return { month, income, expense, net: income - expense };
});

const EXAMPLE_SPENDING = [
  { category: "Home loan EMI", amount: 85500 },
  { category: "Rent", amount: 76000 },
  { category: "Groceries", amount: 27600 },
  { category: "Dining", amount: 15800 },
  { category: "Shopping", amount: 15200 },
  { category: "Other", amount: 29400 },
];

const EXAMPLE_GOALS = [
  { name: "Child's education", saved: 420000, target: 2500000, monthly: 19300, onTrack: true },
  { name: "House deposit", saved: 900000, target: 1500000, monthly: 25000, onTrack: true },
  { name: "Retirement", saved: 2400000, target: 25000000, monthly: 42000, onTrack: false },
];

const EXAMPLE_FUNDS = [
  { name: "Nifty 50 Index Fund, Direct Growth", category: "Index", value: 395000 },
  { name: "Flexi Cap Fund, Direct Growth", category: "Equity", value: 245000 },
  { name: "Short Duration Fund, Direct Growth", category: "Debt", value: 370000 },
  { name: "Gold Fund of Fund, Direct Growth", category: "Gold", value: 75000 },
];

// Adds up to the example allocation above
const EXAMPLE_HOLDINGS = [
  { name: "Mutual funds", value: 1085000 },
  { name: "Stocks", value: 435000 },
  { name: "EPF", value: 980000 },
];

const Shell = ({ id, className = "", children }) => (
  <section id={id} className={`scroll-mt-20 ${className}`}>
    <div className="max-w-6xl mx-auto px-4 lg:px-8">{children}</div>
  </section>
);

const Heading = ({ children, className = "" }) => (
  <h2 className={`font-display text-4xl lg:text-5xl leading-[1.1] tracking-tight ${className}`}>
    {children}
  </h2>
);

const STEPS = [
  {
    title: "Answer ten questions",
    body: "Your goal, time horizon, income and how you react to falling markets set your risk profile and target mix.",
  },
  {
    title: "Add your money",
    body: "Import a mutual fund statement and a bank spreadsheet, then add your accounts, EPF and loans. Or start with sample data.",
  },
  {
    title: "See the gap, then close it",
    body: "Munim.AI shows where you stand against your target and goals, and what it would take to get there.",
  },
];

const HowItWorks = () => (
  <Shell id="how-it-works" className="py-20 lg:py-28 border-t border-line">
    <Heading className="max-w-2xl mb-14">From scattered accounts to a clear plan</Heading>
    <ol className="grid md:grid-cols-3 gap-10 lg:gap-16">
      {STEPS.map((step, index) => (
        <li key={step.title}>
          <p className="font-display text-6xl text-series-1 mb-4">{index + 1}</p>
          <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
          <p className="text-muted">{step.body}</p>
        </li>
      ))}
    </ol>
  </Shell>
);

const ExampleNote = () => (
  <p className="text-sm text-muted mb-5">Example figures</p>
);

const TourHome = () => (
  <div className="grid lg:grid-cols-5 gap-8">
    <div className="lg:col-span-3 min-w-0">
      <p className="text-sm text-muted">Net worth</p>
      <p className="text-4xl font-semibold tracking-tight tnum mt-1 mb-4">
        {formatMoney(7280000)}
      </p>
      <NetWorthChart history={EXAMPLE_HISTORY} />
    </div>
    <div className="lg:col-span-2 min-w-0">
      <p className="font-semibold mb-4">Portfolio mix</p>
      <AllocationCompare allocation={EXAMPLE_ALLOCATION} />
    </div>
  </div>
);

const TourCashFlow = () => (
  <div className="grid lg:grid-cols-5 gap-8">
    <div className="lg:col-span-3 min-w-0">
      <p className="font-semibold mb-4">Income and spending</p>
      <CashFlowChart months={EXAMPLE_MONTHS} />
    </div>
    <div className="lg:col-span-2 min-w-0">
      <p className="font-semibold mb-4">Last 90 days</p>
      <SpendingBars rows={EXAMPLE_SPENDING} />
    </div>
  </div>
);

const TourGoals = () => (
  <div className="grid md:grid-cols-3 gap-8">
    {EXAMPLE_GOALS.map((goal) => (
      <div key={goal.name}>
        <div className="flex justify-between gap-3 mb-3">
          <p className="font-semibold">{goal.name}</p>
          <p className={`text-sm ${goal.onTrack ? "text-gain" : "text-warn"}`}>
            {goal.onTrack ? "On track" : "Behind"}
          </p>
        </div>
        <p className="text-2xl font-semibold tnum tracking-tight">
          {formatCompact(goal.saved)}
          <span className="text-base font-normal text-muted"> of {formatCompact(goal.target)}</span>
        </p>
        <div className="my-3">
          <Progress value={(goal.saved / goal.target) * 100} label={`${goal.name} progress`} />
        </div>
        <p className="text-sm text-muted tnum">
          {formatMoney(goal.monthly)} a month gets you there
        </p>
      </div>
    ))}
  </div>
);

const TourPortfolio = () => (
  <div className="grid lg:grid-cols-5 gap-8">
    <div className="lg:col-span-3 min-w-0">
      <p className="text-sm text-muted">Invested</p>
      <p className="text-4xl font-semibold tracking-tight tnum mt-1 mb-4">
        {formatMoney(2500000)}
      </p>
      <ul className="divide-y divide-line border-y border-line">
        {EXAMPLE_HOLDINGS.map((holding) => (
          <li key={holding.name} className="flex justify-between gap-4 py-3">
            <span>{holding.name}</span>
            <span className="tnum">{formatMoney(holding.value)}</span>
          </li>
        ))}
      </ul>
    </div>
    <div className="lg:col-span-2 min-w-0">
      <p className="font-semibold mb-4">Your mix against your target</p>
      <AllocationCompare allocation={EXAMPLE_ALLOCATION} />
    </div>
  </div>
);

const TourReports = () => {
  const { income, expense, net } = EXAMPLE_MONTHS[EXAMPLE_MONTHS.length - 1];
  const worth = EXAMPLE_HISTORY.map((point) => point.value);
  const rows = [
    ["Income", formatMoney(income)],
    ["Spending", formatMoney(expense)],
    ["Saved", formatMoney(net)],
    ["Savings rate", `${Math.round((net / income) * 100)}%`],
    ["Change in net worth", formatMoney(worth[worth.length - 1] - worth[worth.length - 2])],
  ];

  return (
    <dl className="max-w-xl divide-y divide-line border-y border-line">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 py-3">
          <dt className="text-muted">{label}</dt>
          <dd className="tnum font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

const TOUR = [
  { value: "home", label: "Home", title: "Everything you own and owe, in one number", Panel: TourHome },
  { value: "portfolio", label: "Portfolio", title: "What you hold, and how far it is from your target", Panel: TourPortfolio },
  { value: "cash", label: "Cash flow", title: "Income, spending and budgets from your own transactions", Panel: TourCashFlow },
  { value: "goals", label: "Goals", title: "What each goal needs from you every month", Panel: TourGoals },
  { value: "reports", label: "Reports", title: "A monthly summary of where you stand", Panel: TourReports },
];

const ProductTour = () => {
  const [tab, setTab] = useState("home");
  const { title, Panel } = TOUR.find((item) => item.value === tab);

  return (
    <Shell id="product" className="py-20 lg:py-28 bg-wash">
      <Heading className="max-w-2xl mb-10">Your whole financial picture, kept honest</Heading>
      <Tabs tabs={TOUR} value={tab} onChange={setTab} />
      <div className="bg-surface border border-line rounded-xl p-5 lg:p-8">
        <h3 className="text-xl font-semibold mb-1">{title}</h3>
        <ExampleNote />
        <Panel />
      </div>
    </Shell>
  );
};

const Feature = ({ title, body, children, reverse }) => (
  <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
    <div className={reverse ? "lg:order-2" : ""}>
      <Heading>{title}</Heading>
      <p className="text-lg text-muted mt-5 max-w-md">{body}</p>
    </div>
    <div className={`min-w-0 ${reverse ? "lg:order-1" : ""}`}>{children}</div>
  </div>
);

const StatementPreview = () => (
  <div className="bg-surface border border-line rounded-xl p-6">
    <p className="font-semibold">Check these funds</p>
    <ExampleNote />
    <ul className="divide-y divide-line border-y border-line">
      {EXAMPLE_FUNDS.map((fund) => (
        <li key={fund.name} className="py-3">
          <p className="font-medium">{fund.name}</p>
          <p className="flex justify-between gap-4 text-sm text-muted tnum">
            <span>{fund.category}</span>
            <span>{formatMoney(fund.value)}</span>
          </p>
        </li>
      ))}
    </ul>
  </div>
);

const RebalancePreview = () => (
  <div className="bg-surface border border-line rounded-xl p-6">
    <p className="font-semibold">Rebalancing plan</p>
    <ExampleNote />
    <AllocationCompare allocation={EXAMPLE_ALLOCATION} />
    <div className="border-t border-line mt-4 pt-4 space-y-2">
      <p className="flex justify-between gap-4">
        <span>Reduce debt</span>
        <span className="tnum">{formatMoney(350000)}</span>
      </p>
      <p className="flex justify-between gap-4">
        <span>Add to equity</span>
        <span className="tnum">{formatMoney(175000)}</span>
      </p>
      <p className="flex justify-between gap-4">
        <span>Add to gold</span>
        <span className="tnum">{formatMoney(175000)}</span>
      </p>
    </div>
  </div>
);

const Slider = ({ label, value, display, ...props }) => (
  <label className="block">
    <span className="flex justify-between gap-4 mb-1.5">
      <span className="text-muted">{label}</span>
      <span className="font-medium tnum">{display}</span>
    </span>
    <input
      type="range"
      value={value}
      className="w-full accent-[var(--color-accent)]"
      {...props}
    />
  </label>
);

const SipPreview = () => {
  const [monthly, setMonthly] = useState(25000);
  const [years, setYears] = useState(20);
  const result = useMemo(
    () => projectSip({ monthly, years, annualReturn: 10, stepUp: 5 }),
    [monthly, years],
  );

  return (
    <div className="bg-surface border border-line rounded-xl p-6">
      <p className="text-sm text-muted">Could grow to</p>
      <p className="text-4xl font-semibold tracking-tight tnum mt-1 mb-5">
        {formatCompact(result.value)}
      </p>
      <div className="space-y-4 mb-5">
        <Slider
          label="Monthly SIP"
          display={formatMoney(monthly)}
          value={monthly}
          min={1000}
          max={200000}
          step={1000}
          onChange={(event) => setMonthly(Number(event.target.value))}
        />
        <Slider
          label="Years"
          display={years}
          value={years}
          min={1}
          max={40}
          onChange={(event) => setYears(Number(event.target.value))}
        />
      </div>
      <GrowthChart
        data={result.rows}
        series={[
          { key: "value", label: "Value", color: SERIES[0] },
          { key: "invested", label: "Amount put in", color: SERIES[2] },
        ]}
      />
      <p className="text-sm text-muted mt-3">
        Assumes 10% a year and a 5% yearly increase. An illustration, not a forecast.
      </p>
    </div>
  );
};

const CONVERSATION = [
  { from: "you", text: "Is my emergency fund large enough?" },
  {
    from: "munimji",
    text: "You hold ₹6,00,000 in savings, which covers about 4.9 months of your average spending of ₹1,22,000. Three to six months is a common target, so you're in a reasonable place.",
  },
  { from: "you", text: "Should I clear my credit card first or increase my SIP?" },
  {
    from: "munimji",
    text: "Your ₹38,000 card balance costs 36% a year, far more than investments can reliably earn. Clearing it first usually comes out ahead.",
  },
];

const AssistantDemo = () => (
  <Shell id="assistant" className="py-20 lg:py-28 bg-accent text-canvas">
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
      <div>
        <Heading>Ask about your money, and get answers from your own numbers</Heading>
        <p className="text-lg text-accent-soft mt-5 max-w-md">
          Munimji reads the balances, debts and spending you choose to share.
          It talks about asset classes and never tells you to buy a specific
          stock or fund. Conversations stay saved until you delete them.
        </p>
      </div>
      <div className="bg-surface text-ink rounded-xl p-5 lg:p-6 space-y-4">
        <p className="text-sm text-muted">Example conversation</p>
        {CONVERSATION.map((message) =>
          message.from === "you" ? (
            <div key={message.text} className="flex justify-end">
              <p className="max-w-[85%] bg-accent-soft rounded-xl px-3.5 py-2">
                {message.text}
              </p>
            </div>
          ) : (
            <p key={message.text}>{message.text}</p>
          ),
        )}
      </div>
    </div>
  </Shell>
);

const Profiles = () => (
  <Shell id="profiles" className="py-20 lg:py-28">
    <Heading className="max-w-2xl mb-4">Five ways to invest. One that fits you.</Heading>
    <p className="text-lg text-muted max-w-xl mb-12">
      Your answers place you in one of these. If you need the money soon or
      have no emergency fund, the profile is capped lower, whatever your
      appetite for risk.
    </p>
    <ul className="border-t border-line">
      {PROFILES.map((profile) => (
        <li
          key={profile.label}
          className="grid md:grid-cols-12 gap-3 md:gap-8 py-6 border-b border-line md:items-center"
        >
          <div className="md:col-span-7">
            <h3 className="text-xl font-semibold">{profile.label}</h3>
            <p className="text-muted">{profile.body}</p>
          </div>
          <div className="md:col-span-5">
            <div
              className="flex gap-0.5 h-3 mb-2"
              role="img"
              aria-label={CLASSES.map(({ key, label }) => `${profile[key]}% ${label}`).join(", ")}
            >
              {CLASSES.map(({ key }) => (
                <div
                  key={key}
                  className="first:rounded-l last:rounded-r"
                  style={{ width: `${profile[key]}%`, background: ASSET_CLASS_COLORS[key] }}
                />
              ))}
            </div>
            <p className="text-sm text-muted tnum">
              {profile.equity}% equity, {profile.debt}% debt, {profile.gold}% gold
            </p>
          </div>
        </li>
      ))}
    </ul>
  </Shell>
);

const PROMISES = [
  {
    title: "You choose what the assistant sees",
    body: "Turn off any category in Settings and it is removed before your question goes to the AI model.",
  },
  {
    title: "Statements are read once",
    body: "Your statement and its password are used to read your holdings, then discarded. Neither is stored.",
  },
  {
    title: "No bank login needed",
    body: "Munim.AI never asks for your bank or broker password. You decide what to upload or type in.",
  },
  {
    title: "Your data stays yours",
    body: "Download everything as a file whenever you like, or delete your account and all of it permanently.",
  },
];

const Promises = () => (
  <Shell id="privacy" className="py-20 lg:py-28 bg-wash">
    <Heading className="max-w-2xl mb-12">You stay in control of your data</Heading>
    <dl className="grid md:grid-cols-2 gap-x-16 gap-y-10">
      {PROMISES.map((item) => (
        <div key={item.title} className="border-t border-line-strong pt-5">
          <dt className="text-lg font-semibold">{item.title}</dt>
          <dd className="text-muted mt-1 max-w-md">{item.body}</dd>
        </div>
      ))}
    </dl>
  </Shell>
);

const QUESTIONS = [
  {
    question: "Is this investment advice?",
    answer: "No. Munim.AI helps you understand your finances. It isn't a SEBI-registered adviser, and for major decisions you should speak to one.",
  },
  {
    question: "Which investments does it cover?",
    answer: "Stocks, mutual funds and EPF, grouped into equity, debt and gold. You can also add bank accounts, property, vehicles and loans.",
  },
  {
    question: "Are prices updated automatically?",
    answer: "Not yet. Values come from your latest statement or what you enter, so import a new statement whenever you want fresh numbers.",
  },
  {
    question: "Where do I get a mutual fund statement?",
    answer: "Request a consolidated account statement from CAMS or KFintech. It arrives by email as a password-protected PDF, and that password is the one you set when requesting it.",
  },
  {
    question: "What does the AI model receive?",
    answer: "Your question, a summary of the categories you allow and recent messages. Requests go through OpenRouter to a Google Gemini model.",
  },
  {
    question: "How reliable are the calculators?",
    answer: "They do the maths on the assumptions shown, and you can change every one. Returns aren't guaranteed, so treat the results as illustrations.",
  },
];

const Questions = () => (
  <Shell id="questions" className="py-20 lg:py-28">
    <div className="grid lg:grid-cols-3 gap-10">
      <Heading>Questions</Heading>
      <div className="lg:col-span-2 border-t border-line">
        {QUESTIONS.map((item) => (
          <details key={item.question} className="group border-b border-line">
            <summary className="flex items-center justify-between gap-4 py-4 text-lg font-medium cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              {item.question}
              <Plus size={18} className="shrink-0 text-muted transition-transform group-open:rotate-45" />
            </summary>
            <p className="text-muted pb-5 max-w-2xl">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  </Shell>
);

const ANCHORS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#product", label: "Product" },
  { href: "#assistant", label: "Assistant" },
  { href: "#questions", label: "Questions" },
];

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const startLink = isSignedIn ? "/home" : "/sign-up";
  const startLabel = isSignedIn ? "Open Munim.AI" : "Find my risk profile";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 bg-canvas/95 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-6">
          <Link to="/" aria-label="Munim.AI home">
            <Logo className="text-lg" />
          </Link>
          <nav aria-label="Page sections" className="hidden md:flex items-center gap-6 text-muted">
            {ANCHORS.map((anchor) => (
              <a key={anchor.href} href={anchor.href} className="hover:text-ink transition-colors">
                {anchor.label}
              </a>
            ))}
          </nav>
          <nav aria-label="Account" className="flex items-center gap-2">
            {!isSignedIn && (
              <Link to="/sign-in" className="px-3 h-9 inline-flex items-center text-muted hover:text-ink transition-colors">
                Sign in
              </Link>
            )}
            <Link
              to={startLink}
              className="px-4 h-9 inline-flex items-center rounded-lg bg-accent text-canvas font-medium hover:bg-accent-hover transition-colors whitespace-nowrap"
            >
              {isSignedIn ? "Open Munim.AI" : "Get started"}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 lg:px-8 py-14 lg:py-16 lg:min-h-[calc(100svh-4rem)] grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7">
            <h1 className="font-display text-[clamp(3rem,6.6vw,5.75rem)] leading-[1.02] tracking-tight">
              Is your money set up for the life you want?
            </h1>
            <p className="text-xl text-muted mt-7 max-w-lg">
              Munim.AI brings your investments, spending and goals into one
              picture, and shows how it compares with the risk that's right
              for you.
            </p>
            <Link
              to={startLink}
              className="mt-9 px-6 h-12 inline-flex items-center rounded-lg bg-accent text-canvas text-lg font-medium hover:bg-accent-hover transition-colors"
            >
              {startLabel}
            </Link>
          </div>
          <div className="lg:col-span-5">
            <MixFinder />
            <p className="text-sm text-muted mt-3">
              A quick illustration. The full questionnaire has ten questions.
            </p>
          </div>
        </section>

        <HowItWorks />
        <ProductTour />

        <Shell className="py-20 lg:py-28">
          <div className="space-y-24 lg:space-y-32">
            <Feature
              title="Bring in every fund with one PDF"
              body="Upload your CAMS or KFintech statement. Munim.AI reads each fund, its units, value and cost, and shows you the list before anything is saved. Import a newer statement later and your funds update."
            >
              <StatementPreview />
            </Feature>
            <Feature
              reverse
              title="Know exactly what to change"
              body="When your portfolio drifts, see the rupee amounts that would bring each asset class back to target. Move what you hold, or use only new money and sell nothing."
            >
              <RebalancePreview />
            </Feature>
            <Feature
              title="Test a decision before you make it"
              body="See what a SIP could become, what retirement will take, and whether to prepay a loan or invest. Inside the app, each calculator starts from your own numbers."
            >
              <SipPreview />
            </Feature>
          </div>
        </Shell>

        <AssistantDemo />
        <Profiles />
        <Promises />
        <Questions />

        <section className="bg-accent text-canvas">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-20 lg:py-28 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <Heading className="max-w-xl">
              Start with ten questions. See your numbers after that.
            </Heading>
            <Link
              to={startLink}
              className="shrink-0 px-6 h-12 inline-flex items-center justify-center rounded-lg bg-canvas text-accent text-lg font-medium hover:bg-accent-soft transition-colors"
            >
              {isSignedIn ? "Open Munim.AI" : "Create your account"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-4 lg:px-8 py-10 text-sm text-muted">
        <Logo className="text-base text-ink mb-3" />
        <p className="max-w-2xl">
          Munim.AI helps you understand your finances. It is not a
          SEBI-registered adviser and does not give personal investment advice.
          Investments carry risk, including loss of capital.
        </p>
      </footer>
    </div>
  );
}
