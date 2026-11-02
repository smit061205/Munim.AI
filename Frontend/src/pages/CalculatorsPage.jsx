import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  comparePrepayment,
  finiteOr,
  planDebtPayoff,
  planRetirement,
  projectSip,
} from "../lib/calculators";
import { formatCompact, formatMoney, humanize } from "../lib/format";
import Loaded from "../components/Loaded";
import { GrowthChart, SERIES } from "../components/charts";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Stat,
  Tabs,
} from "../components/ui";

const ASSUMED_RETURNS = { equity: 11, debt: 7, gold: 7 };

const blendedReturn = (allocation) =>
  Math.round(
    Object.entries(ASSUMED_RETURNS).reduce(
      (sum, [key, rate]) => sum + (rate * allocation[key]) / 100,
      0,
    ) * 10,
  ) / 10;

const useForm = (initial) => {
  const [form, setForm] = useState(initial);
  const number = (key) => finiteOr(form[key]);
  const bind = (key) => ({
    type: "number",
    min: 0,
    step: "any",
    value: form[key],
    onChange: (event) => setForm({ ...form, [key]: event.target.value }),
  });
  return { form, setForm, number, bind };
};

const Layout = ({ inputs, children }) => (
  <div className="grid @3xl:grid-cols-5 gap-6">
    <Card className="@3xl:col-span-2 p-5 space-y-4 self-start">{inputs}</Card>
    <div className="@3xl:col-span-3 min-w-0 space-y-6">{children}</div>
  </div>
);

const Pair = ({ children }) => <div className="grid grid-cols-2 gap-3">{children}</div>;

const Assumption = ({ children }) => (
  <p className="text-sm text-muted">{children}</p>
);

const SipCalculator = ({ overview, expectedReturn }) => {
  const savings = overview.cashflow.forecast.monthlySavings;
  const { number, bind } = useForm({
    monthly: savings > 0 ? Math.round(savings / 1000) * 1000 : 10000,
    years: 15,
    annualReturn: expectedReturn,
    stepUp: 5,
  });

  const years = Math.min(Math.floor(number("years")), 50);
  const result = useMemo(
    () =>
      projectSip({
        monthly: number("monthly"),
        years,
        annualReturn: number("annualReturn"),
        stepUp: number("stepUp"),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [number("monthly"), years, number("annualReturn"), number("stepUp")],
  );

  return (
    <Layout
      inputs={
        <>
          <Field label="Monthly SIP">
            <Input {...bind("monthly")} />
          </Field>
          <Field label="Years">
            <Input {...bind("years")} max={50} />
          </Field>
          <Pair>
            <Field label="Return a year (%)">
              <Input {...bind("annualReturn")} />
            </Field>
            <Field label="Yearly increase (%)">
              <Input {...bind("stepUp")} />
            </Field>
          </Pair>
          <Assumption>
            The monthly amount starts from what you've been saving, and the
            return from your target mix.
          </Assumption>
        </>
      }
    >
      <div className="grid grid-cols-2 @lg:grid-cols-3 gap-6">
        <Stat label="Could grow to" value={formatMoney(result.value)} />
        <Stat label="You put in" value={formatMoney(result.invested)} />
        <Stat label="Growth" value={formatMoney(result.gain)} />
      </div>
      <Card className="p-5">
        <GrowthChart
          data={result.rows}
          series={[
            { key: "value", label: "Value", color: SERIES[0] },
            { key: "invested", label: "Amount put in", color: SERIES[2] },
          ]}
        />
      </Card>
    </Layout>
  );
};

const RetirementCalculator = ({ overview, expectedReturn }) => {
  const saved =
    overview.portfolio.value + (overview.retirement?.total_balance || 0);
  const { number, bind } = useForm({
    age: 30,
    retireAge: 60,
    lifeAge: 85,
    monthlyExpense: overview.cashflow.averageMonthlyExpense || 50000,
    inflation: 6,
    growthReturn: expectedReturn,
    retiredReturn: 7,
    saved,
  });

  const result = useMemo(
    () =>
      planRetirement({
        age: number("age"),
        retireAge: number("retireAge"),
        lifeAge: number("lifeAge"),
        monthlyExpense: number("monthlyExpense"),
        inflation: number("inflation"),
        growthReturn: number("growthReturn"),
        retiredReturn: number("retiredReturn"),
        saved: number("saved"),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ["age", "retireAge", "lifeAge", "monthlyExpense", "inflation", "growthReturn", "retiredReturn", "saved"].map(number),
  );

  return (
    <Layout
      inputs={
        <>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Your age">
              <Input {...bind("age")} />
            </Field>
            <Field label="Retire at">
              <Input {...bind("retireAge")} />
            </Field>
            <Field label="Plan to">
              <Input {...bind("lifeAge")} />
            </Field>
          </div>
          <Field label="Monthly spending today">
            <Input {...bind("monthlyExpense")} />
          </Field>
          <Field label="Saved so far" hint="Your portfolio and EPF">
            <Input {...bind("saved")} />
          </Field>
          <Field label="Inflation (%)">
            <Input {...bind("inflation")} />
          </Field>
          <Pair>
            <Field label="Return until retiring (%)">
              <Input {...bind("growthReturn")} />
            </Field>
            <Field label="Return after retiring (%)">
              <Input {...bind("retiredReturn")} />
            </Field>
          </Pair>
        </>
      }
    >
      <div className="grid grid-cols-2 @lg:grid-cols-3 gap-6">
        <Stat label="Amount needed" value={formatCompact(result.corpus)}>
          <span className="text-muted">at age {number("retireAge")}</span>
        </Stat>
        <Stat label="Your savings could reach" value={formatCompact(result.projected)}>
          <span className="text-muted">with nothing added</span>
        </Stat>
        <Stat label="Monthly saving needed" value={formatMoney(result.monthlyNeeded)} />
      </div>
      <p className="text-muted">
        {result.gap === 0
          ? "On these numbers, what you've saved already covers it."
          : `Spending of ${formatMoney(number("monthlyExpense"))} today would be about ${formatMoney(result.firstYearSpend / 12)} a month when you retire.`}
      </p>
      <Card className="p-5">
        <GrowthChart
          data={result.rows}
          series={[
            { key: "value", label: "Savings with the monthly amount", color: SERIES[0] },
            { key: "needed", label: "Amount needed", color: SERIES[2] },
          ]}
        />
      </Card>
    </Layout>
  );
};

const DEFAULT_LOAN = { remaining_balance: 3000000, interest_rate: 8.5, monthly_payment: 30000 };

const PrepaymentCalculator = ({ overview, expectedReturn }) => {
  const loans = overview.liabilities.items.filter(
    (item) => item.type !== "credit_card" && item.monthly_payment > 0,
  );
  const first = loans[0] || DEFAULT_LOAN;

  const { form, setForm, number, bind } = useForm({
    loan: 0,
    balance: first.remaining_balance,
    rate: first.interest_rate ?? 8.5,
    emi: first.monthly_payment,
    extra: 10000,
    investReturn: expectedReturn,
  });

  const chooseLoan = (event) => {
    const index = Number(event.target.value);
    const loan = loans[index];
    setForm({
      ...form,
      loan: index,
      balance: loan.remaining_balance,
      rate: loan.interest_rate ?? 0,
      emi: loan.monthly_payment,
    });
  };

  const result = useMemo(
    () =>
      comparePrepayment({
        balance: number("balance"),
        rate: number("rate"),
        emi: number("emi"),
        extra: number("extra"),
        investReturn: number("investReturn"),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ["balance", "rate", "emi", "extra", "investReturn"].map(number),
  );

  return (
    <Layout
      inputs={
        <>
          {loans.length > 1 && (
            <Field label="Loan">
              <Select value={form.loan} onChange={chooseLoan}>
                {loans.map((loan, index) => (
                  <option key={loan.id || index} value={index}>
                    {humanize(loan.type)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Amount owed">
            <Input {...bind("balance")} />
          </Field>
          <Pair>
            <Field label="Interest rate (%)">
              <Input {...bind("rate")} />
            </Field>
            <Field label="Monthly EMI">
              <Input {...bind("emi")} />
            </Field>
          </Pair>
          <Field label="Extra each month">
            <Input {...bind("extra")} />
          </Field>
          <Field label="Return if invested (%)">
            <Input {...bind("investReturn")} />
          </Field>
          {loans.length === 0 && (
            <Assumption>These are example numbers. Add a loan in Accounts to fill them in.</Assumption>
          )}
        </>
      }
    >
      {result.error ? (
        <p role="alert" className="text-loss">{result.error}</p>
      ) : (
        <>
          <p className="font-display text-2xl leading-snug">
            {result.betterOption === "prepay"
              ? "On these numbers, prepaying leaves you ahead"
              : "On these numbers, investing leaves you ahead"}{" "}
            by {formatMoney(result.difference)}.
          </p>
          <div className="grid grid-cols-2 gap-6">
            <Stat label="Interest saved by prepaying" value={formatMoney(result.interestSaved)} />
            <Stat
              label="Loan ends sooner by"
              value={`${Math.floor(result.monthsSaved / 12)}y ${result.monthsSaved % 12}m`}
            />
            <Stat label="If you invest the extra" value={formatMoney(result.invested)} />
            <Stat label="If you prepay, then invest the EMI" value={formatMoney(result.afterPrepaying)} />
          </div>
          <Card className="p-5">
            <GrowthChart
              data={result.rows}
              series={[
                { key: "current", label: "Loan as it stands", color: SERIES[2] },
                { key: "prepaying", label: "With the extra payment", color: SERIES[0] },
              ]}
            />
          </Card>
          <Assumption>
            Both totals are measured on the day the loan would otherwise end.
            Investment returns aren't guaranteed, while interest saved is
            certain. Tax on gains and any home loan tax benefit aren't included.
          </Assumption>
        </>
      )}
    </Layout>
  );
};

const years = (months) => `${Math.floor(months / 12)}y ${months % 12}m`;

const DebtPayoffCalculator = ({ overview }) => {
  const [debts, setDebts] = useState(() =>
    overview.liabilities.items.map((item) => ({
      name: humanize(item.type),
      balance: item.remaining_balance,
      rate: item.interest_rate ?? 0,
      minimum: item.monthly_payment || 0,
    })),
  );
  const [extra, setExtra] = useState(5000);
  const update = (index, key) => (event) =>
    setDebts(debts.map((debt, position) => (position === index ? { ...debt, [key]: event.target.value } : debt)));

  const result = useMemo(
    () =>
      planDebtPayoff({
        debts: debts.map((debt) => ({ ...debt, balance: finiteOr(debt.balance), rate: finiteOr(debt.rate), minimum: finiteOr(debt.minimum) })),
        extra: finiteOr(extra),
      }),
    [debts, extra],
  );

  return (
    <Layout
      inputs={
        <>
          {debts.map((debt, index) => (
            <div key={index} className="space-y-2 pb-3 border-b border-line">
              <Input aria-label="Debt name" value={debt.name} onChange={update(index, "name")} />
              <div className="grid grid-cols-3 gap-2">
                <Field label="Owed"><Input type="number" min="0" value={debt.balance} onChange={update(index, "balance")} /></Field>
                <Field label="Rate %"><Input type="number" min="0" step="any" value={debt.rate} onChange={update(index, "rate")} /></Field>
                <Field label="EMI"><Input type="number" min="0" value={debt.minimum} onChange={update(index, "minimum")} /></Field>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDebts([...debts, { name: `Debt ${debts.length + 1}`, balance: 100000, rate: 12, minimum: 5000 }])}
          >
            Add a debt
          </Button>
          <Field label="Extra each month" hint="On top of every EMI. It goes to one debt at a time.">
            <Input type="number" min="0" value={extra} onChange={(event) => setExtra(event.target.value)} />
          </Field>
        </>
      }
    >
      {result.error ? (
        <Card className="p-5"><p className="text-muted">{result.error}</p></Card>
      ) : (
        <>
          <p className="font-display text-2xl leading-snug">
            Paying the highest rate first clears everything in {years(result.avalanche.months)} and saves{" "}
            {formatMoney(result.minimumOnly.interest - result.avalanche.interest)} of interest against paying only the EMIs.
          </p>
          <div className="grid grid-cols-2 @2xl:grid-cols-3 gap-6">
            <Stat label="Highest rate first" value={formatMoney(result.avalanche.interest)}>
              <span className="text-muted">interest, done in {years(result.avalanche.months)}</span>
            </Stat>
            <Stat label="Smallest balance first" value={formatMoney(result.snowball.interest)}>
              <span className="text-muted">interest, done in {years(result.snowball.months)}</span>
            </Stat>
            <Stat label="EMIs only" value={formatMoney(result.minimumOnly.interest)}>
              <span className="text-muted">interest, done in {years(result.minimumOnly.months)}</span>
            </Stat>
          </div>
          <Card className="p-5">
            <GrowthChart
              data={result.rows.map((row) => ({ ...row, year: Math.round((row.month / 12) * 10) / 10 }))}
              series={[
                { key: "avalanche", label: "Highest rate first", color: SERIES[0] },
                { key: "snowball", label: "Smallest balance first", color: SERIES[2] },
              ]}
            />
          </Card>
          <Card className="p-5">
            <h3 className="font-medium mb-2">Order, highest rate first</h3>
            <ol className="divide-y divide-line">
              {result.avalanche.order.map((debt) => (
                <li key={debt.name} className="flex justify-between gap-4 py-2">
                  <span>{debt.name}</span>
                  <span className="text-muted tnum">cleared in {years(debt.paidOffMonth ?? 0)}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Assumption>
            Smallest balance first costs {formatMoney(Math.max(result.saving, 0))} more but clears single debts sooner, which some people find easier to stick with.
          </Assumption>
        </>
      )}
    </Layout>
  );
};

const CALCULATORS = {
  sip: { label: "SIP", Component: SipCalculator },
  retirement: { label: "Retirement", Component: RetirementCalculator },
  prepay: { label: "Prepay or invest", Component: PrepaymentCalculator },
  debts: { label: "Debt payoff", Component: DebtPayoffCalculator },
};

export default function CalculatorsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = CALCULATORS[params.get("tab")] ? params.get("tab") : "sip";
  const { Component } = CALCULATORS[tab];
  const expectedReturn = blendedReturn(user.investorProfile.allocation);

  return (
    <Loaded>
      {(overview) => (
        <>
          <PageHeader
            title="Calculators"
            description="Started from your own numbers. Change anything to see what happens."
          />
          <Tabs
            tabs={Object.entries(CALCULATORS).map(([value, { label }]) => ({ value, label }))}
            value={tab}
            onChange={(value) => setParams({ tab: value })}
          />
          <Component key={tab} overview={overview} expectedReturn={expectedReturn} />
          <p className="text-sm text-muted mt-8 max-w-2xl">
            Default returns assume {ASSUMED_RETURNS.equity}% a year for equity
            and {ASSUMED_RETURNS.debt}% for debt and gold, weighted by your
            target mix. These are illustrations, not forecasts or promises.
          </p>
        </>
      )}
    </Loaded>
  );
}
