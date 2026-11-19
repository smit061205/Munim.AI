import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatDayMonth, formatMoney, formatPercent } from "../lib/format";
import { Logo } from "../components/Logo";
import { AllocationCompare, NetWorthChart } from "../components/charts";
import { Card, ErrorState, SectionTitle, Skeleton, Stat, StatStrip } from "../components/ui";

const GAIN_TYPES = {
  equityShort: "Equity, short term",
  equityLong: "Equity, long term",
  otherLong: "Other, long term",
  slab: "Taxed at slab rate",
};

// What someone sees when they open a read-only link
export default function SharedPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/share/view/${encodeURIComponent(token)}`)
      .then((result) => setData(result.data))
      .catch((failure) => setError(failure.message));
  }, [token]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-surface">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <span className="text-sm text-muted">Read-only</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8 @container">
        {error ? (
          <ErrorState message={error} />
        ) : !data ? (
          <div className="space-y-4" aria-label="Loading">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-60" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{data.owner}'s finances</h1>
            <p className="text-muted mb-6">
              Shared with {data.label}. As of {formatDayMonth(data.asOf)}; this link ends {formatDayMonth(data.expiresAt)}.
            </p>

            <StatStrip>
              <Stat label="Net worth" value={formatMoney(data.netWorth.value)} />
              <Stat label="Investments" value={formatMoney(data.portfolio.value)} />
              <Stat label="Cash" value={formatMoney(data.cash)} />
              <Stat label="Debts" value={formatMoney(data.liabilities.total)} />
            </StatStrip>

            {data.netWorth.history.length >= 2 && (
              <Card className="p-5 mb-6">
                <SectionTitle title="Net worth over time" />
                <NetWorthChart history={data.netWorth.history} />
              </Card>
            )}

            <div className="grid @3xl:grid-cols-2 gap-6 mb-6">
              <Card className="p-5">
                <SectionTitle
                  title="Mix"
                  description={data.portfolio.xirr == null ? undefined : `Yearly return ${formatPercent(data.portfolio.xirr)}`}
                />
                <AllocationCompare allocation={data.portfolio.allocation} />
              </Card>
              <Card className="p-5">
                <SectionTitle title="Goals" />
                {data.goals.length ? (
                  <ul className="divide-y divide-line">
                    {data.goals.map((goal) => (
                      <li key={goal.name} className="flex justify-between gap-4 py-2">
                        <span>{goal.name}</span>
                        <span className="tnum text-muted">{formatMoney(goal.saved)} of {formatMoney(goal.target)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">No goals set.</p>
                )}
              </Card>
            </div>

            <Card className="mb-6">
              <div className="p-5 pb-3"><SectionTitle title="Holdings" /></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-muted border-y border-line">
                      <th className="px-5 py-2 font-medium">Holding</th>
                      <th className="px-3 py-2 font-medium text-right">Invested</th>
                      <th className="px-3 py-2 font-medium text-right">Value</th>
                      <th className="px-5 py-2 font-medium text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.portfolio.holdings.map((item, index) => (
                      <tr key={`${item.name}-${index}`} className="border-b border-line last:border-0">
                        <td className="px-5 py-2">{item.name}<span className="block text-xs text-muted">{item.detail}</span></td>
                        <td className="px-3 py-2 text-right tnum">{item.invested ? formatMoney(item.invested) : "–"}</td>
                        <td className="px-3 py-2 text-right tnum">{formatMoney(item.value)}</td>
                        <td className="px-5 py-2 text-right tnum text-muted">{item.weight}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {data.tax && (
              <Card className="p-5 mb-6">
                <SectionTitle
                  title={`Tax, FY ${data.tax.fy}`}
                  description={`The ${data.tax.regimes.better} regime looks better by ${formatMoney(data.tax.regimes.saving)}. 80C used: ${formatMoney(data.tax.deductions.total80c)}.`}
                />
                <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-4 mb-4">
                  {Object.entries(GAIN_TYPES).map(([key, label]) => (
                    <Stat key={key} label={label} value={formatMoney(data.tax.capitalGains.totals[key])} />
                  ))}
                </div>
                {data.tax.capitalGains.sales.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="text-left text-muted border-y border-line">
                          <th className="py-2 pr-3 font-medium">Holding</th>
                          <th className="py-2 px-3 font-medium">Bought</th>
                          <th className="py-2 px-3 font-medium">Sold</th>
                          <th className="py-2 px-3 font-medium text-right">Cost</th>
                          <th className="py-2 px-3 font-medium text-right">Sale value</th>
                          <th className="py-2 pl-3 font-medium text-right">Gain</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.tax.capitalGains.sales.map((sale, index) => (
                          <tr key={index} className="border-b border-line last:border-0">
                            <td className="py-2 pr-3">{sale.holding}</td>
                            <td className="py-2 px-3 tnum">{sale.boughtOn}</td>
                            <td className="py-2 px-3 tnum">{sale.soldOn}</td>
                            <td className="py-2 px-3 text-right tnum">{formatMoney(sale.cost)}</td>
                            <td className="py-2 px-3 text-right tnum">{formatMoney(sale.proceeds)}</td>
                            <td className="py-2 pl-3 text-right tnum">{formatMoney(sale.gain)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            <p className="text-sm text-muted">Figures are estimates from what {data.owner} has entered in Munim.AI. Market prices may be delayed.</p>
          </>
        )}
      </main>
    </div>
  );
}
