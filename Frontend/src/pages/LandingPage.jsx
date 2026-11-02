import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeIndianRupee,
  CalendarClock,
  Check,
  EyeOff,
  FileText,
  Goal,
  Landmark,
  Languages,
  LayoutDashboard,
  LineChart,
  Lock,
  MessageCircle,
  Receipt,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/AppLayout";

const Shell = ({ className = "", children, id }) => (
  <section id={id} className={`px-4 lg:px-8 ${className}`}>
    <div className="max-w-6xl mx-auto">{children}</div>
  </section>
);

const Header = ({ isSignedIn }) => (
  <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur border-b border-line/60">
    <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-6">
      <Link to="/" aria-label="Munim.AI home">
        <Logo className="text-[17px]" />
      </Link>
      <nav aria-label="Sections" className="hidden md:flex items-center gap-7 text-[15px] text-muted">
        <a href="#how" className="hover:text-ink">How it works</a>
        <a href="#product" className="hover:text-ink">Product</a>
        <a href="#india" className="hover:text-ink">Built for India</a>
        <a href="#faq" className="hover:text-ink">Questions</a>
      </nav>
      <div className="flex items-center gap-2">
        {isSignedIn ? (
          <Link to="/today" className="inline-flex items-center h-9 px-4 rounded-lg bg-accent text-surface text-sm font-medium hover:bg-accent-hover">
            Open Munim
          </Link>
        ) : (
          <>
            <Link to="/sign-in" className="hidden sm:inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium text-muted hover:text-ink">
              Sign in
            </Link>
            <Link to="/sign-up" className="inline-flex items-center h-9 px-4 rounded-lg bg-accent text-surface text-sm font-medium hover:bg-accent-hover">
              Get started
            </Link>
          </>
        )}
      </div>
    </div>
  </header>
);

// The hero's product window: Today's net worth, with the assistant answering
// a question and proposing a change. It plays once; with reduced motion it
// shows the finished state.
const REPLY =
  "You've spent ₹8,240 on eating out this month, against ₹5,100 on average. A ₹6,000 dining budget would keep about ₹26,000 more a year for your house goal.";

const HeroDemo = () => {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(reduce ? 4 : 0);
  const [typed, setTyped] = useState(reduce ? REPLY.length : 0);

  useEffect(() => {
    if (reduce) return undefined;
    const timers = [
      setTimeout(() => setStage(1), 500),
      setTimeout(() => setStage(2), 1300),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduce]);

  useEffect(() => {
    if (reduce || stage !== 2) return undefined;
    if (typed >= REPLY.length) {
      const timer = setTimeout(() => setStage(3), 350);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setTyped((count) => Math.min(count + 3, REPLY.length)), 22);
    return () => clearTimeout(timer);
  }, [stage, typed, reduce]);

  useEffect(() => {
    if (reduce || stage !== 3) return undefined;
    const timer = setTimeout(() => setStage(4), 1600);
    return () => clearTimeout(timer);
  }, [stage, reduce]);

  const points = [12, 18, 15, 24, 22, 30, 34, 31, 40, 44, 42, 52];
  const path = points.map((value, index) => `${index === 0 ? "M" : "L"} ${index * 30} ${60 - value}`).join(" ");

  return (
    <div className="relative" aria-label="A preview of Munim: net worth on the left, the assistant answering a question about dining out on the right">
      <div className="rounded-2xl bg-surface border border-line shadow-[var(--shadow-float)] overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 h-10 border-b border-line bg-wash/60">
          <span className="w-2.5 h-2.5 rounded-full bg-line-strong" />
          <span className="w-2.5 h-2.5 rounded-full bg-line-strong" />
          <span className="w-2.5 h-2.5 rounded-full bg-line-strong" />
          <span className="ml-3 text-xs text-faint">Today</span>
        </div>
        <div className="grid sm:grid-cols-[1fr_1.1fr]">
          <div className="p-5 sm:border-r border-line">
            <p className="text-xs text-muted">Net worth</p>
            <p className="figure tnum text-[34px] mt-1.5">₹82,39,733</p>
            <p className="text-sm mt-1.5">
              <span className="text-gain font-medium tnum">+₹93,734 (1.2%)</span> <span className="text-muted">in 30 days</span>
            </p>
            <svg viewBox="0 0 330 64" className="w-full h-16 mt-4" aria-hidden="true">
              <path d={`${path} L 330 64 L 0 64 Z`} fill="var(--color-accent-soft)" />
              <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-warn-soft text-warn inline-flex items-center justify-center"><CalendarClock size={13} /></span>
                <span className="flex-1">Home loan EMI in 2 days</span>
                <span className="tnum text-muted">₹38,500</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-accent-soft text-accent inline-flex items-center justify-center"><LineChart size={13} /></span>
                <span className="flex-1">Equity 18 points under target</span>
              </li>
            </ul>
          </div>
          <div className="p-5 bg-canvas/50 flex flex-col gap-3 min-h-[300px]">
            <div className={`self-end max-w-[85%] rounded-2xl rounded-br-md bg-accent text-surface px-3.5 py-2 text-sm transition-all duration-500 ${stage >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
              Can I afford to eat out more?
            </div>
            <div className={`max-w-[95%] text-sm leading-relaxed transition-opacity duration-300 ${stage >= 2 ? "opacity-100" : "opacity-0"}`}>
              <p className="flex items-center gap-1.5 text-xs text-muted mb-1">
                <MessageCircle size={12} /> Munim checked your spending and goals
              </p>
              <p>{REPLY.slice(0, typed)}</p>
            </div>
            <div className={`mt-auto rounded-xl border border-line bg-surface p-3 transition-all duration-500 ${stage >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
              <p className="text-xs text-muted">Proposed change</p>
              <p className="text-sm font-medium mt-0.5">Set a ₹6,000 monthly budget for Dining</p>
              <div className="flex gap-2 mt-2.5">
                {stage >= 4 ? (
                  <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-gain-soft text-gain text-xs font-medium">
                    <Check size={13} /> Budget created
                  </span>
                ) : (
                  <>
                    <span className="inline-flex items-center h-7 px-2.5 rounded-md bg-accent text-surface text-xs font-medium">Confirm</span>
                    <span className="inline-flex items-center h-7 px-2.5 rounded-md border border-line text-xs font-medium text-muted">Not now</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Hero = ({ isSignedIn }) => (
  <Shell className="pt-14 pb-20 lg:pt-20 lg:pb-28">
    <div className="grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-14 items-center">
      <div>
        <h1 className="font-display text-[44px] sm:text-[56px] lg:text-[64px] leading-[1.02]">
          Know where your money stands, and what to do next.
        </h1>
        <p className="text-lg sm:text-xl text-muted mt-6 max-w-xl leading-relaxed">
          Munim brings your mutual funds, shares, bank accounts and loans into one view, priced every day. Ask it anything in plain words. It changes things only when you say yes.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-9">
          <Link
            to={isSignedIn ? "/today" : "/sign-up"}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-accent text-surface text-base font-medium hover:bg-accent-hover active:scale-[0.98] transition-[background-color,transform]"
          >
            {isSignedIn ? "Open Munim" : "Get started free"} <ArrowRight size={18} />
          </Link>
          {!isSignedIn && (
            <Link to="/sign-in" className="inline-flex items-center h-12 px-5 rounded-xl text-base font-medium text-ink border border-line-strong bg-surface hover:bg-wash">
              Try the demo account
            </Link>
          )}
        </div>
        <p className="text-sm text-muted mt-5">Ten questions to find your risk profile. No bank login needed.</p>
      </div>
      <HeroDemo />
    </div>
  </Shell>
);

const STEPS = [
  {
    icon: Upload,
    title: "Bring it in",
    body: "Upload your mutual fund CAS, demat statement and bank statements. Munim reads each one, shows you what it found, and saves only what you confirm.",
  },
  {
    icon: LayoutDashboard,
    title: "See where you stand",
    body: "Net worth, returns against the Nifty 50, spending by category, and how your mix compares with the risk that suits you. Prices update daily from AMFI and NSE.",
  },
  {
    icon: MessageCircle,
    title: "Act on it",
    body: "Each week Munim tells you what changed and what needs you. Ask why, ask what to do, and approve the budget, goal or reminder it suggests.",
  },
];

const HowItWorks = () => (
  <Shell id="how" className="py-20 lg:py-28 bg-surface border-y border-line">
    <h2 className="font-display text-[34px] sm:text-[42px] leading-tight max-w-2xl">From scattered statements to a plan in an afternoon.</h2>
    <ol className="grid md:grid-cols-3 gap-10 md:gap-8 mt-14">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        return (
          <li key={step.title}>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-accent-soft text-accent inline-flex items-center justify-center">
                <Icon size={19} />
              </span>
              <span className="text-sm font-medium text-faint tnum">Step {index + 1}</span>
            </div>
            <h3 className="text-xl font-semibold mt-5">{step.title}</h3>
            <p className="text-muted mt-2 leading-relaxed">{step.body}</p>
          </li>
        );
      })}
    </ol>
  </Shell>
);

const Row = ({ label, value, tone, sub }) => (
  <div className="flex items-center justify-between gap-4 py-2.5 border-b border-line last:border-0 text-sm">
    <span className="min-w-0">
      <span className="block truncate">{label}</span>
      {sub && <span className="block text-xs text-muted">{sub}</span>}
    </span>
    <span className={`tnum shrink-0 ${tone || ""}`}>{value}</span>
  </div>
);

const Bar = ({ label, value, width, tone = "bg-accent" }) => (
  <div className="text-sm">
    <div className="flex justify-between mb-1.5">
      <span>{label}</span>
      <span className="tnum text-muted">{value}</span>
    </div>
    <div className="h-1.5 rounded-full bg-wash overflow-hidden">
      <div className={`h-full rounded-full ${tone}`} style={{ width }} />
    </div>
  </div>
);

const SECTIONS = [
  {
    key: "today",
    icon: LayoutDashboard,
    label: "Today",
    title: "One screen that tells you what matters",
    body: "Your net worth and how it moved, the bills due this week, budgets running over, and a short note on your week. Everything else is one click away.",
    preview: (
      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted">Net worth</p>
          <p className="figure tnum text-[30px] mt-1">₹82,39,733</p>
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Needs your attention</p>
          <Row label="Dining is over budget" sub="₹8,240 of ₹6,000" value="Ask why" tone="text-accent" />
          <Row label="Credit card bill" sub="Due tomorrow" value="₹36,000" />
          <Row label="Nifty 50 SIP missed" sub="5 October" value="₹8,000" tone="text-warn" />
        </div>
      </div>
    ),
  },
  {
    key: "money",
    icon: ArrowLeftRight,
    label: "Money",
    title: "Spending, budgets and bills together",
    body: "Transactions are sorted into categories as they arrive. Recurring payments and subscriptions are found for you, including the ones that quietly got more expensive.",
    preview: (
      <div className="space-y-3.5">
        <Bar label="Rent" value="₹25,000" width="100%" />
        <Bar label="Groceries" value="₹9,410" width="38%" />
        <Bar label="Dining" value="₹8,240" width="33%" tone="bg-loss" />
        <Bar label="Transport" value="₹3,920" width="16%" />
        <div className="pt-2">
          <Row label="Netflix" sub="Monthly, up from ₹499" value="₹649" tone="text-warn" />
          <Row label="Electricity" sub="Due 12 Nov" value="₹2,140" />
        </div>
      </div>
    ),
  },
  {
    key: "wealth",
    icon: Landmark,
    label: "Wealth",
    title: "Every fund at today's price, against the index",
    body: "See your real yearly return (XIRR) next to what the Nifty 50 would have made on the same dates, and the exact rupee moves that bring your mix back to target.",
    preview: (
      <div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted">Your return</p>
            <p className="text-2xl font-semibold tnum">+13.8%</p>
          </div>
          <div>
            <p className="text-xs text-muted">Nifty 50, same dates</p>
            <p className="text-2xl font-semibold tnum">+11.2%</p>
          </div>
        </div>
        <Row label="Parag Parikh Flexi Cap" sub="Equity" value="₹6,42,180" />
        <Row label="HDFC Short Term Debt" sub="Debt" value="₹3,10,420" />
        <Row label="Sovereign Gold Bond 2031" sub="Gold" value="₹1,80,796" />
      </div>
    ),
  },
  {
    key: "plan",
    icon: Goal,
    label: "Plan",
    title: "Goals and tax, worked out from your numbers",
    body: "Move a slider to see when a goal lands. Compare the old and new tax regimes, track 80C, and book long-term gains under the ₹1.25 lakh tax-free limit before March.",
    preview: (
      <div className="space-y-4">
        <Bar label="House deposit" value="₹12.4 L of ₹20 L" width="62%" tone="bg-gain" />
        <Bar label="Child's education" value="₹4.1 L of ₹25 L" width="17%" />
        <div className="rounded-xl bg-wash p-3 text-sm">
          <p className="font-medium">New regime saves you ₹31,200</p>
          <p className="text-muted mt-0.5">₹78,000 of long-term gains can still be booked tax-free this year.</p>
        </div>
      </div>
    ),
  },
];

const ProductTour = () => {
  const [active, setActive] = useState("today");
  const section = SECTIONS.find((item) => item.key === active);

  return (
    <Shell id="product" className="py-20 lg:py-28">
      <h2 className="font-display text-[34px] sm:text-[42px] leading-tight max-w-2xl">Four places for everything, not forty pages.</h2>
      <p className="text-lg text-muted mt-4 max-w-2xl">Today for what needs you. Money for what comes and goes. Wealth for what you own and owe. Plan for where you're headed.</p>

      <div role="tablist" aria-label="Parts of Munim" className="flex gap-2 mt-10 overflow-x-auto scrollbar-none">
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              role="tab"
              aria-selected={active === item.key}
              onClick={() => setActive(item.key)}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[15px] font-medium whitespace-nowrap transition-colors ${
                active === item.key ? "bg-ink text-canvas" : "bg-surface border border-line text-muted hover:text-ink"
              }`}
            >
              <Icon size={16} /> {item.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center mt-8">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">{section.title}</h3>
          <p className="text-muted text-lg mt-3 leading-relaxed">{section.body}</p>
        </div>
        <div className="rounded-2xl bg-surface border border-line shadow-[var(--shadow-raise)] p-6">{section.preview}</div>
      </div>
    </Shell>
  );
};

const INDIA = [
  { icon: BadgeIndianRupee, title: "Daily NAVs from AMFI", body: "Every mutual fund priced from the official AMFI file, and shares from NSE." },
  { icon: FileText, title: "CAMS, KFintech, NSDL and CDSL", body: "Upload the statements you already get by email, password-locked or not." },
  { icon: Receipt, title: "Old or new regime", body: "Both worked out from your income and deductions, with 80C and 80D tracked." },
  { icon: LineChart, title: "Gains harvesting", body: "A nudge to book long-term gains inside the ₹1.25 lakh yearly exemption." },
  { icon: CalendarClock, title: "EMIs, SIPs and premiums", body: "Reminders before they're due, and a flag when a SIP instalment doesn't show up." },
  { icon: Languages, title: "English, Hindi or Hinglish", body: "Ask the way you talk. Munim answers in the same language." },
];

const BuiltForIndia = () => (
  <Shell id="india" className="py-20 lg:py-28 bg-surface border-y border-line">
    <div className="grid lg:grid-cols-[1fr_1.6fr] gap-12">
      <div>
        <h2 className="font-display text-[34px] sm:text-[42px] leading-tight">Built for how money works in India.</h2>
        <p className="text-lg text-muted mt-4">Lakhs and crores, financial years that start in April, and the statements you already have.</p>
      </div>
      <ul className="grid sm:grid-cols-2 gap-x-10">
        {INDIA.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="flex gap-4 py-5 border-t border-line">
              <Icon size={20} className="text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-muted mt-1">{item.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  </Shell>
);

const PROMISES = [
  { icon: Lock, title: "Statements aren't kept", body: "Files are read in memory and discarded. Only what you confirm is saved." },
  { icon: ShieldCheck, title: "Nothing changes without you", body: "The assistant proposes. You confirm or dismiss every budget, goal and reminder." },
  { icon: EyeOff, title: "Hide amounts in one click", body: "Blur every figure when you're sharing your screen or sitting on a train." },
  { icon: Trash2, title: "Leave whenever you like", body: "Export your data or delete your account and everything in it from Settings." },
];

const Trust = () => (
  <Shell className="py-20 lg:py-28">
    <h2 className="font-display text-[34px] sm:text-[42px] leading-tight max-w-2xl">Your money, your call.</h2>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
      {PROMISES.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title}>
            <Icon size={22} className="text-ink" />
            <h3 className="font-semibold mt-4">{item.title}</h3>
            <p className="text-muted mt-1.5">{item.body}</p>
          </div>
        );
      })}
    </div>
  </Shell>
);

const FAQ = [
  {
    q: "Do I have to connect my bank account?",
    a: "No. Munim works from the statements you upload and anything you add by hand. It never asks for net banking passwords.",
  },
  {
    q: "Is this investment advice?",
    a: "No. Munim explains your own numbers and shows what a change would do. It isn't a SEBI-registered adviser, and decisions stay yours.",
  },
  {
    q: "Which statements can it read?",
    a: "A detailed CAS from CAMS or KFintech for mutual funds, NSDL or CDSL statements for shares, and bank or card statements as PDF, Excel or CSV.",
  },
  {
    q: "What does the assistant know about me?",
    a: "Your figures in Munim and anything you ask it to remember. You can see and delete those memories in Settings at any time.",
  },
  {
    q: "What does it cost?",
    a: "It's free while in early access.",
  },
];

const Questions = () => (
  <Shell id="faq" className="py-20 lg:py-28 bg-surface border-t border-line">
    <div className="grid lg:grid-cols-[1fr_1.6fr] gap-12">
      <h2 className="font-display text-[34px] sm:text-[42px] leading-tight">Questions</h2>
      <div className="divide-y divide-line border-y border-line">
        {FAQ.map((item) => (
          <details key={item.q} className="group py-5">
            <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-lg font-medium">
              {item.q}
              <span className="text-faint text-2xl leading-none transition-transform group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="text-muted mt-3 max-w-2xl leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  </Shell>
);

export default function LandingPage() {
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Header isSignedIn={isSignedIn} />
      <main>
        <Hero isSignedIn={isSignedIn} />
        <HowItWorks />
        <ProductTour />
        <BuiltForIndia />
        <Trust />
        <Questions />

        <section className="px-4 lg:px-8 py-20 lg:py-24 bg-ink text-canvas">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <h2 className="font-display text-[34px] sm:text-[42px] leading-tight max-w-xl">See your whole financial picture today.</h2>
              <p className="text-canvas/70 mt-3 text-lg">Ten questions, one statement, and you're set.</p>
            </div>
            <Link
              to={isSignedIn ? "/today" : "/sign-up"}
              className="shrink-0 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-canvas text-ink text-base font-medium hover:opacity-90"
            >
              {isSignedIn ? "Open Munim" : "Get started free"} <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-4 lg:px-8 py-10 flex flex-col md:flex-row justify-between gap-6 text-sm text-muted">
        <Logo className="text-base text-ink" />
        <p className="max-w-2xl md:text-right">
          Munim.AI helps you understand your finances. It is not a SEBI-registered adviser and does not give personal investment advice. Investments carry risk, including loss of capital.
        </p>
      </footer>
    </div>
  );
}
