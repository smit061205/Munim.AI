import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatCompact, formatMoney, humanize } from "../lib/format";
import Loaded from "../components/Loaded";
import { AllocationCompare, NetWorthChart } from "../components/charts";
import { Badge, Card, Delta, SectionTitle } from "../components/ui";

const ASSUMED_RETURNS = { equity: 11, debt: 7, gold: 7 };

const blendedReturn = (allocation) =>
  Object.entries(ASSUMED_RETURNS).reduce((sum, [key, rate]) => sum + ((allocation?.[key] || 0) / 100) * rate, 0) || 8;

// Fixed order, so a colour always means the same kind of asset
const PARTS = [
  { key: "investments", label: "Investments", color: "var(--color-series-1)", to: "/wealth/investments" },
  { key: "epf", label: "Provident fund", color: "var(--color-series-2)", to: "/wealth/investments" },
  { key: "cash", label: "Cash in banks", color: "var(--color-series-3)", to: "/wealth/accounts" },
  { key: "property", label: "Property", color: "var(--color-series-4)", to: "/wealth/accounts" },
  { key: "vehicles", label: "Vehicles", color: "var(--color-series-5)", to: "/wealth/accounts" },
];

const Composition = ({ data }) => {
  const values = {
    investments: data.portfolio.value,
    epf: data.retirement?.total_balance || 0,
    cash: data.assets.cash,
    property: data.assets.property,
    vehicles: data.assets.vehicles,
  };
  const parts = PARTS.filter((part) => values[part.key] > 0);
  const gross = data.netWorth.grossAssets || 1;
  const [hovered, setHovered] = useState(null);

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Net worth</p>
          <p className="figure tnum text-[44px] sm:text-[52px] mt-2">{formatMoney(data.netWorth.value)}</p>
          {data.netWorth.change !== null && (
            <p className="mt-3">
              <Delta value={data.netWorth.change} percent={data.netWorth.changePercent} /> <span className="text-muted">in 30 days</span>
            </p>
          )}
        </div>
        <dl className="flex gap-8 text-right">
          <div>
            <dt className="text-sm text-muted">You own</dt>
            <dd className="text-xl font-semibold tnum">{formatMoney(data.netWorth.grossAssets)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">You owe</dt>
            <dd className="text-xl font-semibold tnum">{formatMoney(data.liabilities.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-7 flex h-3 gap-[2px] rounded-full overflow-hidden" role="img" aria-label="What your assets are made of">
        {parts.map((part) => (
          <div
            key={part.key}
            onMouseEnter={() => setHovered(part.key)}
            onMouseLeave={() => setHovered(null)}
            title={`${part.label}: ${formatMoney(values[part.key])}`}
            className="h-full transition-opacity"
            style={{
              width: `${(values[part.key] / gross) * 100}%`,
              background: part.color,
              opacity: hovered && hovered !== part.key ? 0.35 : 1,
            }}
          />
        ))}
      </div>
      <ul className="mt-5 grid sm:grid-cols-2 @3xl:grid-cols-3 gap-x-8 gap-y-1">
        {parts.map((part) => (
          <li key={part.key}>
            <Link
              to={part.to}
              onMouseEnter={() => setHovered(part.key)}
              onMouseLeave={() => setHovered(null)}
              className="flex items-center gap-3 py-2 -mx-2 px-2 rounded-lg hover:bg-wash"
            >
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: part.color }} aria-hidden="true" />
              <span className="flex-1 min-w-0 truncate">{part.label}</span>
              <span className="tnum">{formatCompact(values[part.key])}</span>
              <span className="tnum text-sm text-muted w-10 text-right">{Math.round((values[part.key] / gross) * 100)}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const Debts = ({ liabilities }) => (
  <Card>
    <div className="px-5 pt-5 pb-3 flex items-center justify-between">
      <h2 className="font-semibold">What you owe</h2>
      <Link to="/wealth/accounts" className="text-sm text-muted hover:text-ink">Manage loans</Link>
    </div>
    {liabilities.items.length ? (
      <>
        <ul className="divide-y divide-line border-t border-line">
          {[...liabilities.items].sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0)).map((debt, index) => (
            <li key={debt._id || index} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate">{humanize(debt.type)}</p>
                <p className="text-sm text-muted">
                  {debt.interest_rate ?? 0}% interest, {formatMoney(debt.monthly_payment)} a month
                </p>
              </div>
              <span className="tnum shrink-0">{formatMoney(debt.remaining_balance)}</span>
            </li>
          ))}
        </ul>
        <p className="px-5 py-3 border-t border-line text-sm text-muted">
          Highest interest first. <Link to="/plan/tools?tab=debts" className="text-accent hover:underline">Plan the payoff</Link>
        </p>
      </>
    ) : (
      <p className="px-5 pb-5 text-muted">No loans recorded. Add them on the Accounts page to complete your net worth.</p>
    )}
  </Card>
);

// Projects net worth forward from today's saving, and finds when it covers
// 25 years of spending, the usual rule of thumb for financial independence
const Forecast = ({ data }) => {
  const { user } = useAuth();
  const yearly = blendedReturn(user.investorProfile?.allocation);
  const monthlyRate = yearly / 1200;
  const saving = Math.max(data.cashflow.forecast.monthlySavings || 0, 0);
  const target = (data.cashflow.averageMonthlyExpense || 0) * 12 * 25;

  const at = (months) => data.netWorth.value * (1 + monthlyRate) ** months + saving * (((1 + monthlyRate) ** months - 1) / monthlyRate);

  let reached = null;
  if (target > 0) {
    for (let month = 0; month <= 720; month += 1) {
      if (at(month) >= target) {
        reached = month;
        break;
      }
    }
  }
  const reachedYear = reached !== null ? new Date().getFullYear() + Math.ceil(reached / 12) : null;

  return (
    <Card className="p-5">
      <SectionTitle
        title="Where this is heading"
        description={`If you keep saving ${formatMoney(saving)} a month and it grows at ${yearly.toFixed(1)}% a year, your target mix's long-run average.`}
      />
      <dl className="grid grid-cols-3 gap-4">
        {[5, 10, 20].map((years) => (
          <div key={years}>
            <dt className="text-sm text-muted">In {years} years</dt>
            <dd className="text-xl font-semibold tnum tracking-tight mt-0.5">{formatCompact(at(years * 12))}</dd>
          </div>
        ))}
      </dl>
      {target > 0 && (
        <div className="mt-5 pt-4 border-t border-line">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">Financial independence</p>
            {reached === 0 && <Badge tone="gain">Reached</Badge>}
          </div>
          <p className="text-sm text-muted mt-1">
            {formatCompact(target)}, or 25 years of your current spending.{" "}
            {reached === null
              ? "Not within 60 years at this pace. Saving more each month moves it fastest."
              : reached === 0
                ? "Your net worth already covers it."
                : `You'd get there around ${reachedYear}.`}
          </p>
        </div>
      )}
      <p className="text-xs text-faint mt-4">An illustration, not a forecast. Returns vary and aren't guaranteed.</p>
    </Card>
  );
};

export default function WealthPage() {
  return (
    <Loaded>
      {(data) => (
        <div className="space-y-4">
          <Composition data={data} />
          <Card className="p-5">
            <SectionTitle title="Net worth over time" />
            <NetWorthChart history={data.netWorth.history} />
          </Card>
          <div className="grid @3xl:grid-cols-2 gap-4">
            <Forecast data={data} />
            <Debts liabilities={data.liabilities} />
          </div>
          <Card className="p-5">
            <SectionTitle title="Mix against your target" description="Your investments, EPF and cash by asset class.">
              <Link to="/wealth/investments" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
                Rebalancing plan <ArrowUpRight size={14} />
              </Link>
            </SectionTitle>
            <AllocationCompare allocation={data.portfolio.allocation} />
          </Card>
        </div>
      )}
    </Loaded>
  );
}
