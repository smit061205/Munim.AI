import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatCompact,
  formatDayMonth,
  formatMoney,
  formatMonthLong,
  formatMonthShort,
} from "../../lib/format";

// Theme tokens, so charts follow dark mode
const COLORS = {
  ink: "var(--color-ink)",
  muted: "var(--color-muted)",
  line: "var(--color-line)",
  accent: "var(--color-accent)",
  surface: "var(--color-surface)",
};

// Fixed order: a hue always follows its entity, never its rank
export const SERIES = ["#2F6BB5", "#17A08C", "#C98A12", "#8B62C4", "#D5614A"];
const OTHER = "#A3A9B1";

export const ASSET_CLASS_COLORS = {
  equity: SERIES[0],
  debt: SERIES[1],
  gold: SERIES[2],
};

const axisTick = { fill: COLORS.muted, fontSize: 12 };

const TooltipCard = ({ title, rows }) => (
  <div className="bg-surface border border-line rounded-lg px-3 py-2 text-sm">
    <p className="text-muted mb-0.5">{title}</p>
    {rows.map((row) => (
      <div key={row.label} className="flex items-center gap-2">
        {row.color && (
          <span
            className="w-2.5 h-2.5 rounded-sm"
            style={{ background: row.color }}
          />
        )}
        <span className="text-muted">{row.label}</span>
        <span className="tnum font-medium ml-auto pl-4">
          {formatMoney(row.value)}
        </span>
      </div>
    ))}
  </div>
);

const ViewToggle = ({ showTable, onChange }) => (
  <button
    onClick={() => onChange(!showTable)}
    className="text-sm text-muted hover:text-ink transition-colors no-print"
  >
    {showTable ? "Show chart" : "Show table"}
  </button>
);

const DataTable = ({ columns, rows }) => (
  <div className="max-h-72 overflow-y-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-muted border-b border-line">
          {columns.map((column, index) => (
            <th
              key={column}
              className={`py-2 font-medium ${index > 0 ? "text-right" : ""}`}
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]} className="border-b border-line last:border-0">
            {row.map((cell, index) => (
              <td
                key={index}
                className={`py-2 ${index > 0 ? "text-right tnum" : ""}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RANGES = [
  { value: 6, label: "6M" },
  { value: 12, label: "1Y" },
  { value: 0, label: "All" },
];

const monthsAgo = (months) => {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  return since.toISOString().slice(0, 10);
};

export const NetWorthChart = ({ history }) => {
  const [chosenRange, setRange] = useState(12);
  const [showTable, setShowTable] = useState(false);

  // A range is only offered when it shows something different from the
  // next longer one, so short histories don't get buttons that do nothing
  const ranges = useMemo(() => {
    const oldest = history.reduce(
      (earliest, row) => (row.date < earliest ? row.date : earliest),
      history[0]?.date ?? "",
    );
    return RANGES.filter(
      (option) => option.value === 0 || oldest < monthsAgo(option.value),
    );
  }, [history]);

  const range = ranges.some((option) => option.value === chosenRange)
    ? chosenRange
    : 0;

  const data = useMemo(() => {
    if (!range) return history;
    const key = monthsAgo(range);
    return history.filter((row) => row.date >= key);
  }, [history, range]);

  const axisFormat = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      month: "short",
      timeZone: "UTC",
    });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex gap-1" role="group" aria-label="Time range">
          {ranges.length > 1 && ranges.map((option) => (
            <button
              key={option.value}
              aria-pressed={range === option.value}
              onClick={() => setRange(option.value)}
              className={`px-2.5 py-1 rounded-md text-sm transition-colors ${
                range === option.value
                  ? "bg-accent-soft text-accent font-medium"
                  : "text-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <ViewToggle showTable={showTable} onChange={setShowTable} />
      </div>

      {showTable ? (
        <DataTable
          columns={["Date", "Net worth"]}
          rows={[...data]
            .reverse()
            .map((row) => [formatDayMonth(row.date), formatMoney(row.value)])}
        />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={COLORS.line} />
              <XAxis
                dataKey="date"
                tickFormatter={axisFormat}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={formatCompact}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={64}
                domain={["auto", "auto"]}
              />
              <Tooltip
                cursor={{ stroke: COLORS.muted, strokeDasharray: "3 3" }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <TooltipCard
                      title={formatDayMonth(payload[0].payload.date)}
                      rows={[{ label: "Net worth", value: payload[0].value }]}
                    />
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={COLORS.accent}
                strokeWidth={2}
                fill="url(#netWorthFill)"
                activeDot={{ r: 4, stroke: COLORS.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const Legend = ({ items }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
    {items.map((item) => (
      <span key={item.label} className="flex items-center gap-1.5">
        <span
          className="w-2.5 h-2.5 rounded-sm"
          style={{ background: item.color }}
        />
        {item.label}
      </span>
    ))}
  </div>
);

export const CashFlowChart = ({ months }) => {
  const [showTable, setShowTable] = useState(false);
  const income = SERIES[0];
  const expense = SERIES[2];

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-3">
        <Legend
          items={[
            { label: "Income", color: income },
            { label: "Spending", color: expense },
          ]}
        />
        <ViewToggle showTable={showTable} onChange={setShowTable} />
      </div>

      {showTable ? (
        <DataTable
          columns={["Month", "Income", "Spending", "Net"]}
          rows={[...months]
            .reverse()
            .map((row) => [
              formatMonthLong(row.month),
              formatMoney(row.income),
              formatMoney(row.expense),
              formatMoney(row.net),
            ])}
        />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} barGap={2} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={COLORS.line} />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthShort}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tickFormatter={formatCompact}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <ReferenceLine y={0} stroke={COLORS.line} />
              <Tooltip
                cursor={{ fill: "#F4F4F1" }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <TooltipCard
                      title={formatMonthLong(payload[0].payload.month)}
                      rows={[
                        { label: "Income", value: payload[0].payload.income, color: income },
                        { label: "Spending", value: payload[0].payload.expense, color: expense },
                        { label: "Net", value: payload[0].payload.net },
                      ]}
                    />
                  ) : null
                }
              />
              <Bar dataKey="income" fill={income} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
              <Bar dataKey="expense" fill={expense} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// Year-by-year projections, sharing one rupee axis
export const GrowthChart = ({ data, series }) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-3">
        <Legend items={series} />
        <ViewToggle showTable={showTable} onChange={setShowTable} />
      </div>
      {showTable ? (
        <DataTable
          columns={["Year", ...series.map((item) => item.label)]}
          rows={data.map((row) => [
            `Year ${row.year}`,
            ...series.map((item) => formatMoney(row[item.key])),
          ])}
        />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={COLORS.line} />
              <XAxis
                dataKey="year"
                tickFormatter={(year) => `Y${year}`}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                tickFormatter={formatCompact}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={64}
              />
              <Tooltip
                cursor={{ stroke: COLORS.muted, strokeDasharray: "3 3" }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <TooltipCard
                      title={`Year ${payload[0].payload.year}`}
                      rows={series.map((item) => ({
                        label: item.label,
                        value: payload[0].payload[item.key],
                        color: item.color,
                      }))}
                    />
                  ) : null
                }
              />
              {series.map((item) => (
                <Line
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  stroke={item.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: COLORS.surface, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// Ranked rows read better than a pie here: categories keep their order and
// the amounts are visible without hovering
export const SpendingBars = ({ rows, limit = 6 }) => {
  const shown = useMemo(() => {
    if (rows.length <= limit) return rows;
    const rest = rows.slice(limit - 1);
    return [
      ...rows.slice(0, limit - 1),
      {
        category: "Other",
        amount: rest.reduce((sum, row) => sum + row.amount, 0),
      },
    ];
  }, [rows, limit]);

  const largest = Math.max(...shown.map((row) => row.amount), 1);

  return (
    <ul className="space-y-3">
      {shown.map((row) => (
        <li key={row.category} title={`${row.category}: ${formatMoney(row.amount)}`}>
          <div className="flex justify-between gap-4 text-sm mb-1">
            <span>{row.category}</span>
            <span className="tnum text-muted">{formatMoney(row.amount)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-wash overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(row.amount / largest) * 100}%`,
                background: row.category === "Other" ? OTHER : COLORS.accent,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

const AllocationStrip = ({ slices, getValue, label }) => (
  <div>
    <p className="text-sm text-muted mb-1.5">{label}</p>
    <div className="flex gap-0.5 h-3" role="img" aria-label={`${label}: ${slices
      .map((slice) => `${slice.label} ${getValue(slice)}%`)
      .join(", ")}`}>
      {slices.map((slice) =>
        getValue(slice) > 0 ? (
          <div
            key={slice.key}
            title={`${slice.label} ${getValue(slice)}%`}
            className="first:rounded-l last:rounded-r"
            style={{
              width: `${getValue(slice)}%`,
              background: ASSET_CLASS_COLORS[slice.key],
            }}
          />
        ) : null,
      )}
    </div>
  </div>
);

// Where the portfolio is against the mix the user's profile aims for
export const AllocationCompare = ({ allocation }) => {
  const hasTarget = allocation.every((slice) => slice.target !== null);

  return (
    <div className="space-y-4">
      <AllocationStrip
        label="Your portfolio"
        slices={allocation}
        getValue={(slice) => slice.percent}
      />
      {hasTarget && (
        <AllocationStrip
          label="Your target"
          slices={allocation}
          getValue={(slice) => slice.target}
        />
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted border-b border-line">
            <th className="py-2 font-medium">Asset class</th>
            <th className="py-2 font-medium text-right">Value</th>
            <th className="py-2 font-medium text-right">Now</th>
            {hasTarget && (
              <th className="py-2 font-medium text-right">Target</th>
            )}
          </tr>
        </thead>
        <tbody>
          {allocation.map((slice) => (
            <tr key={slice.key} className="border-b border-line last:border-0">
              <td className="py-2">
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ background: ASSET_CLASS_COLORS[slice.key] }}
                  />
                  {slice.label}
                </span>
              </td>
              <td className="py-2 text-right tnum">{formatMoney(slice.value)}</td>
              <td className="py-2 text-right tnum">{slice.percent}%</td>
              {hasTarget && (
                <td className="py-2 text-right tnum text-muted">
                  {slice.target}%
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
