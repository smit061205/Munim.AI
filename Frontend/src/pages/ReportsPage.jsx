import React, { useCallback, useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import {
  downloadFile,
  formatDate,
  formatMoney,
  formatMonthLong,
  toCsv,
} from "../lib/format";
import { CashFlowChart } from "../components/charts";
import {
  Button,
  Card,
  Delta,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  SectionTitle,
  Skeleton,
  Stat,
} from "../components/ui";

const currentMonth = () => new Date().toISOString().slice(0, 7);

// A statement reads best for a finished month
const lastCompleteMonth = () => {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
};

export default function ReportsPage() {
  const { user } = useAuth();
  const { overview } = useData();
  const [month, setMonth] = useState(lastCompleteMonth());
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api(`/wealth/reports/monthly?month=${month}`);
      setReport(data);
    } catch (err) {
      setError(err.message);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () =>
    downloadFile(
      `munim-report-${month}.csv`,
      toCsv([
        ["Month", formatMonthLong(month)],
        ["Income", report.income],
        ["Spending", report.expense],
        ["Net", report.net],
        [],
        ["Category", "Amount", "Share"],
        ...report.categories.map((row) => [row.category, row.amount, `${row.share}%`]),
      ]),
    );

  return (
    <>
      <PageHeader title="Reports" description={`Statement for ${formatMonthLong(month)}`}>
        <Input
          type="month"
          aria-label="Report month"
          value={month}
          max={currentMonth()}
          onChange={(event) => event.target.value && setMonth(event.target.value)}
          className="!w-44"
        />
        <Button variant="secondary" disabled={!report} onClick={exportCsv}>
          <Download size={16} /> CSV
        </Button>
        <Button variant="secondary" disabled={!report} onClick={() => window.print()}>
          <Printer size={16} /> Save as PDF
        </Button>
      </PageHeader>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !report ? (
        <Skeleton className="h-64" />
      ) : report.transactionCount === 0 ? (
        <Card>
          <EmptyState
            title="No transactions this month"
            description="Choose another month, or import your transactions in Cash flow."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-6">
            <Stat label="Income" value={formatMoney(report.income)}>
              <Delta value={report.income - report.previous.income} /> <span className="text-muted">on last month</span>
            </Stat>
            <Stat label="Spending" value={formatMoney(report.expense)}>
              <span className="tnum text-muted">
                {report.expense >= report.previous.expense ? "Up " : "Down "}
                {formatMoney(Math.abs(report.expense - report.previous.expense))} on last month
              </span>
            </Stat>
            <Stat label="Net" value={formatMoney(report.net)} />
            <Stat label="Savings rate" value={`${report.savingsRate}%`} />
          </div>

          <div className="grid @3xl:grid-cols-2 gap-6">
            <Card className="p-5">
              <SectionTitle title="Spending by category" />
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-line">
                    <th className="py-2 font-medium">Category</th>
                    <th className="py-2 font-medium text-right">Amount</th>
                    <th className="py-2 font-medium text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {report.categories.map((row) => (
                    <tr key={row.category} className="border-b border-line last:border-0">
                      <td className="py-2">{row.category}</td>
                      <td className="py-2 text-right tnum">{formatMoney(row.amount)}</td>
                      <td className="py-2 text-right tnum text-muted">{row.share}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card className="p-5">
              <SectionTitle title="Largest payments" />
              <ul className="divide-y divide-line text-sm">
                {report.largest.map((row) => (
                  <li key={row.id || row._id} className="flex justify-between gap-4 py-2">
                    <span className="min-w-0 truncate">
                      {row.description || row.category}
                      <span className="text-muted"> on {formatDate(row.date, user.preferences?.dateFormat)}</span>
                    </span>
                    <span className="tnum shrink-0">{formatMoney(Math.abs(row.amount))}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {overview && (
            <Card className="p-5">
              <SectionTitle
                title="Forecast"
                description={
                  overview.cashflow.forecast.basedOnMonths > 0
                    ? `If the last ${overview.cashflow.forecast.basedOnMonths} complete months continue`
                    : "Needs at least one complete month of transactions"
                }
              />
              <div className="grid grid-cols-2 gap-6 mb-6">
                <Stat label="Saved each month" value={formatMoney(overview.cashflow.forecast.monthlySavings)} />
                <Stat label="Saved over a year" value={formatMoney(overview.cashflow.forecast.yearlySavings)} />
              </div>
              <CashFlowChart months={overview.cashflow.months} />
            </Card>
          )}
        </div>
      )}
    </>
  );
}
