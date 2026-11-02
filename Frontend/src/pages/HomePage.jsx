import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Info } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import { formatDate, formatMoney } from "../lib/format";
import Loaded from "../components/Loaded";
import {
  AllocationCompare,
  CashFlowChart,
  NetWorthChart,
  SpendingBars,
} from "../components/charts";
import {
  Button,
  Card,
  Delta,
  Money,
  Progress,
  SectionTitle,
  useToast,
} from "../components/ui";

const CardLink = ({ to, children }) => (
  <Link to={to} className="text-sm text-muted hover:text-ink transition-colors no-print">
    {children}
  </Link>
);

const FIRST_STEPS = [
  {
    to: "/accounts",
    title: "Add a bank account",
    body: "Your balances are the base of your net worth.",
  },
  {
    to: "/portfolio",
    title: "Add your investments",
    body: "See your mix against your risk profile.",
  },
  {
    to: "/cash-flow",
    title: "Import transactions",
    body: "Upload a spreadsheet to see where money goes.",
  },
];

const EmptyHome = () => {
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

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-4xl leading-tight">
        Welcome, {user.firstName}. Let's put your money in one place.
      </h1>
      <p className="text-muted mt-3 mb-8">
        Your target mix is {user.investorProfile.allocation.equity}% equity,{" "}
        {user.investorProfile.allocation.debt}% debt and{" "}
        {user.investorProfile.allocation.gold}% gold. Add your finances to see
        how you compare.
      </p>
      <div className="divide-y divide-line border-y border-line">
        {FIRST_STEPS.map((step) => (
          <Link
            key={step.to}
            to={step.to}
            className="block py-4 hover:bg-wash -mx-3 px-3 rounded-lg transition-colors"
          >
            <p className="font-medium">{step.title}</p>
            <p className="text-muted">{step.body}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={busy} onClick={loadSample}>
          {busy ? "Adding sample data..." : "Load sample data"}
        </Button>
        <p className="text-sm text-muted">
          Explore with made-up numbers. You can remove them any time.
        </p>
      </div>
    </div>
  );
};

const HealthCard = ({ health }) => (
  <Card className="p-5">
    <SectionTitle
      title="Financial health"
      description="Scored from the four factors below."
    />
    {health.score === null ? (
      <p className="text-muted">
        Add a few months of transactions to see your score.
      </p>
    ) : (
      <>
        <p className="text-4xl font-semibold tnum tracking-tight mb-4">
          {health.score}
          <span className="text-base text-muted font-normal"> of 100</span>
        </p>
        <ul className="space-y-3">
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
      </>
    )}
  </Card>
);

const Insights = ({ insights }) =>
  insights.length > 0 && (
    <Card className="divide-y divide-line">
      {insights.map((insight) => (
        <Link
          key={insight.id}
          to={insight.href}
          className="flex gap-3 p-4 hover:bg-wash transition-colors first:rounded-t-xl last:rounded-b-xl"
        >
          {insight.severity === "warning" ? (
            <AlertTriangle size={18} className="text-warn shrink-0 mt-0.5" />
          ) : (
            <Info size={18} className="text-muted shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium">{insight.title}</p>
            <p className="text-sm text-muted">{insight.body}</p>
          </div>
        </Link>
      ))}
    </Card>
  );

export default function HomePage() {
  const { user } = useAuth();

  return (
    <Loaded>
      {(data) =>
        data.isEmpty ? (
          <EmptyHome />
        ) : (
          <div className="space-y-6">
            <div className="grid @3xl:grid-cols-3 gap-6">
              <Card className="@3xl:col-span-2 p-5">
                <p className="text-sm text-muted">Net worth</p>
                <p className="text-4xl font-semibold tracking-tight tnum mt-1">
                  {formatMoney(data.netWorth.value)}
                </p>
                <p className="text-sm mt-1 mb-4">
                  {data.netWorth.change === null ? (
                    <span className="text-muted">
                      Your trend appears after 30 days of history
                    </span>
                  ) : (
                    <>
                      <Delta
                        value={data.netWorth.change}
                        percent={data.netWorth.changePercent}
                      />{" "}
                      <span className="text-muted">in 30 days</span>
                    </>
                  )}
                </p>
                <NetWorthChart history={data.netWorth.history} />
              </Card>
              <HealthCard health={data.health} />
            </div>

            <Insights insights={data.insights} />

            <div className="grid @3xl:grid-cols-2 gap-6">
              <Card className="p-5">
                <SectionTitle title="Portfolio mix">
                  <CardLink to="/portfolio">View portfolio</CardLink>
                </SectionTitle>
                <AllocationCompare allocation={data.portfolio.allocation} />
              </Card>
              <Card className="p-5">
                <SectionTitle
                  title="Spending"
                  description="Last 90 days, by category"
                >
                  <CardLink to="/cash-flow">View cash flow</CardLink>
                </SectionTitle>
                {data.spending.length ? (
                  <SpendingBars rows={data.spending} />
                ) : (
                  <p className="text-muted">No spending in the last 90 days.</p>
                )}
              </Card>
            </div>

            <Card className="p-5">
              <SectionTitle title="Cash flow" description="Last 12 months" />
              <CashFlowChart months={data.cashflow.months} />
            </Card>

            <div className="grid @3xl:grid-cols-2 gap-6">
              <Card className="p-5">
                <SectionTitle title="Recent transactions">
                  <CardLink to="/cash-flow">View all</CardLink>
                </SectionTitle>
                {data.recentTransactions.length ? (
                  <ul className="divide-y divide-line">
                    {data.recentTransactions.map((item) => (
                      <li
                        key={item.id || item._id}
                        className="flex justify-between gap-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate">
                            {item.description || item.category}
                          </p>
                          <p className="text-sm text-muted">
                            {formatDate(item.date, user.preferences?.dateFormat)}
                          </p>
                        </div>
                        <p
                          className={`tnum shrink-0 ${
                            item.type === "income" ? "text-gain" : ""
                          }`}
                        >
                          {item.type === "income" ? "+" : "-"}
                          {formatMoney(Math.abs(item.amount))}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">No transactions yet.</p>
                )}
              </Card>

              <Card className="p-5">
                <SectionTitle title="Goals">
                  <CardLink to="/goals">View goals</CardLink>
                </SectionTitle>
                {data.goals.length ? (
                  <ul className="space-y-4">
                    {data.goals.slice(0, 4).map((goal) => (
                      <li key={goal.id}>
                        <div className="flex justify-between gap-4 text-sm mb-1">
                          <span>{goal.name}</span>
                          <span className="text-muted tnum">
                            <Money value={goal.saved_amount} /> of{" "}
                            <Money value={goal.target_amount} />
                          </span>
                        </div>
                        <Progress value={goal.progress} label={goal.name} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">
                    Set a goal to see what you need to save each month.
                  </p>
                )}
              </Card>
            </div>
          </div>
        )
      }
    </Loaded>
  );
}
