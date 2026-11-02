import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatDayMonth, formatMoney } from "../lib/format";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  FormModal,
  Input,
  PageHeader,
  Progress,
  SectionTitle,
  Skeleton,
  Stat,
  Toggle,
  useToast,
} from "../components/ui";

const GAIN_TYPES = {
  equityShort: "Equity, short term",
  equityLong: "Equity, long term",
  otherLong: "Other, long term",
  slab: "Taxed at your slab",
};

const ProfileModal = ({ fy, profile, onSaved, onClose }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    salary: profile.salaryIsEstimate ? "" : profile.salary,
    other_income: profile.other_income || "",
    hra_exemption: profile.hra_exemption || "",
    extra_80c: profile.extra_80c || "",
    nps_80ccd1b: profile.nps_80ccd1b || "",
    self_senior: profile.self_senior,
    parents_senior: profile.parents_senior,
  });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return (
    <FormModal
      title="Your income and deductions"
      description="Only what the app can't see in your records."
      submitLabel="Save"
      onClose={onClose}
      onSubmit={async () => {
        await api("/tax/profile", {
          method: "PUT",
          body: {
            fy,
            ...form,
            other_income: Number(form.other_income) || 0,
            hra_exemption: Number(form.hra_exemption) || 0,
            extra_80c: Number(form.extra_80c) || 0,
            nps_80ccd1b: Number(form.nps_80ccd1b) || 0,
          },
        });
        await onSaved();
        toast.success("Tax details saved");
      }}
    >
      <Field label="Gross yearly salary" hint={`Leave blank to use ${formatMoney(profile.estimatedSalary)}, worked out from your income.`}>
        <Input type="number" min="0" value={form.salary} onChange={set("salary")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Other income">
          <Input type="number" min="0" value={form.other_income} onChange={set("other_income")} />
        </Field>
        <Field label="HRA exemption">
          <Input type="number" min="0" value={form.hra_exemption} onChange={set("hra_exemption")} />
        </Field>
        <Field label="Other 80C" hint="PPF, tuition fees">
          <Input type="number" min="0" value={form.extra_80c} onChange={set("extra_80c")} />
        </Field>
        <Field label="NPS under 80CCD(1B)">
          <Input type="number" min="0" value={form.nps_80ccd1b} onChange={set("nps_80ccd1b")} />
        </Field>
      </div>
      <Toggle checked={form.self_senior} onChange={(value) => setForm({ ...form, self_senior: value })} label="I'm 60 or older" />
      <Toggle checked={form.parents_senior} onChange={(value) => setForm({ ...form, parents_senior: value })} label="My parents are 60 or older" />
    </FormModal>
  );
};

const RegimeCard = ({ name, regime, better }) => (
  <div className={`rounded-lg border p-4 ${better ? "border-accent" : "border-line"}`}>
    <div className="flex items-center justify-between gap-2 mb-2">
      <p className="font-medium">{name}</p>
      {better && <Badge tone="accent">Lower tax</Badge>}
    </div>
    <p className="text-2xl font-semibold tnum tracking-tight">{formatMoney(regime.total)}</p>
    <dl className="text-sm mt-3 space-y-1.5">
      <div className="flex justify-between"><dt className="text-muted">Deductions</dt><dd className="tnum">{formatMoney(regime.deductions)}</dd></div>
      <div className="flex justify-between"><dt className="text-muted">Taxable income</dt><dd className="tnum">{formatMoney(regime.taxable)}</dd></div>
      <div className="flex justify-between"><dt className="text-muted">Cess and surcharge</dt><dd className="tnum">{formatMoney(regime.cess + regime.surcharge)}</dd></div>
    </dl>
  </div>
);

export default function TaxPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api("/tax/summary");
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !summary) return <ErrorState message={error} onRetry={load} />;
  if (!summary) {
    return (
      <div className="space-y-4" aria-label="Loading">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  const { regimes, deductions, capitalGains, harvesting, profile } = summary;

  return (
    <>
      <PageHeader
        title="Tax"
        description={`An estimate for FY ${summary.fy} under ${summary.rules}. ${summary.daysToYearEnd} days left in the year.`}
      >
        <Button variant="secondary" onClick={() => setEditing(true)}>Edit income and deductions</Button>
      </PageHeader>

      <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-6 mb-8">
        <Stat label="Estimated tax" value={formatMoney(regimes[regimes.better].total)}>
          <span className="text-muted">Under the {regimes.better} regime</span>
        </Stat>
        <Stat label="Regime saving" value={formatMoney(regimes.saving)} />
        <Stat label="80C used" value={`${formatMoney(Math.min(deductions.total80c, deductions.limit80c))}`}>
          <span className="text-muted">of {formatMoney(deductions.limit80c)}</span>
        </Stat>
        <Stat label="Capital gains tax" value={formatMoney(capitalGains.tax.total)}>
          <span className="text-muted">On sales so far this year</span>
        </Stat>
      </div>

      <Card className="p-5 mb-6">
        <SectionTitle
          title="Old or new regime"
          description={`Salary of ${formatMoney(profile.salary)}${profile.salaryIsEstimate ? ", estimated from your income. Enter the real figure for a better estimate." : "."}`}
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <RegimeCard name="New regime" regime={regimes.new} better={regimes.better === "new"} />
          <RegimeCard name="Old regime" regime={regimes.old} better={regimes.better === "old"} />
        </div>
      </Card>

      <div className="grid @3xl:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <SectionTitle title="Section 80C" description="Found in your records, plus anything you added." />
          <div className="mb-4">
            <Progress value={(deductions.total80c / deductions.limit80c) * 100} tone={deductions.room80c > 0 ? "accent" : "gain"} label="80C used" />
            <p className="text-sm text-muted mt-1.5 tnum">
              {deductions.room80c > 0
                ? `${formatMoney(deductions.room80c)} of room left. ELSS funds, PPF and life cover premiums all count.`
                : "Fully used. Anything more under 80C won't lower your tax."}
            </p>
          </div>
          <ul className="divide-y divide-line">
            {deductions.items80c.map((item) => (
              <li key={item.label} className="flex justify-between gap-4 py-2">
                <span>
                  {item.label}
                  <span className="block text-sm text-muted">{item.source}</span>
                </span>
                <span className="tnum">{formatMoney(item.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Other deductions" description="Old regime only." />
          <dl className="space-y-2">
            <div className="flex justify-between gap-4">
              <dt>Health insurance, you and family (80D)</dt>
              <dd className="tnum">{formatMoney(deductions.claimed.d80Self)} <span className="text-muted">of {formatMoney(deductions.health.limitSelf)}</span></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Health insurance, parents (80D)</dt>
              <dd className="tnum">{formatMoney(deductions.claimed.d80Parents)} <span className="text-muted">of {formatMoney(deductions.health.limitParents)}</span></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Home loan interest (24b)</dt>
              <dd className="tnum">{formatMoney(deductions.claimed.homeLoanInterest)} <span className="text-muted">of {formatMoney(200000)}</span></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>NPS (80CCD 1B)</dt>
              <dd className="tnum">{formatMoney(deductions.claimed.nps1b)} <span className="text-muted">of {formatMoney(50000)}</span></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>HRA</dt>
              <dd className="tnum">{formatMoney(deductions.claimed.hra)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <SectionTitle title="Capital gains this year" description={`Long-term equity gains up to ${formatMoney(capitalGains.exemption.limit)} a year are tax-free.`} />
        <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-4 mb-5">
          {Object.entries(GAIN_TYPES).map(([key, label]) => (
            <Stat key={key} label={label} value={formatMoney(capitalGains.totals[key])} />
          ))}
        </div>
        {capitalGains.sales.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-muted border-y border-line">
                  <th className="py-2 pr-3 font-medium">Holding</th>
                  <th className="py-2 px-3 font-medium">Sold</th>
                  <th className="py-2 px-3 font-medium">Type</th>
                  <th className="py-2 pl-3 font-medium text-right">Gain</th>
                </tr>
              </thead>
              <tbody>
                {capitalGains.sales.map((sale, index) => (
                  <tr key={`${sale.holding}-${sale.soldOn}-${index}`} className="border-b border-line last:border-0">
                    <td className="py-2 pr-3">{sale.holding}</td>
                    <td className="py-2 px-3 tnum">{formatDayMonth(sale.soldOn)}</td>
                    <td className="py-2 px-3 text-muted">{GAIN_TYPES[sale.type]}</td>
                    <td className={`py-2 pl-3 text-right tnum ${sale.gain < 0 ? "text-loss" : ""}`}>{formatMoney(sale.gain)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">No sales this year. Record sales on the <Link to="/portfolio" className="underline">Portfolio</Link> page or import a statement.</p>
        )}
      </Card>

      <div className="grid @3xl:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionTitle title="Tax-loss harvesting" description="Holdings now below cost. Selling one books a loss that offsets gains." />
          {harvesting.losses.length ? (
            <>
              <ul className="divide-y divide-line">
                {harvesting.losses.map((item) => (
                  <li key={item.holdingId} className="flex justify-between gap-4 py-2">
                    <span>{item.holding}</span>
                    <span className="tnum text-loss">{formatMoney(item.gain)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted mt-3">
                {harvesting.lossSaving > 0
                  ? `Booking these before 31 March would save about ${formatMoney(harvesting.lossSaving)} this year.`
                  : "Your gains are already under the tax-free limit, so this saves nothing now, but losses can be carried forward for eight years."}
              </p>
            </>
          ) : (
            <p className="text-muted">None of your holdings are below cost.</p>
          )}
        </Card>
        <Card className="p-5">
          <SectionTitle title="Tax-free gain harvesting" description="Sell and buy back long-term equity to use this year's exemption." />
          {harvesting.harvestable > 0 && harvesting.gainHarvest.length ? (
            <>
              <p className="mb-3">
                You can book <b className="tnum">{formatMoney(harvesting.harvestable)}</b> more of gains tax-free this year.
              </p>
              <ul className="divide-y divide-line">
                {harvesting.gainHarvest.slice(0, 5).map((item) => (
                  <li key={item.holdingId} className="flex justify-between gap-4 py-2">
                    <span>{item.holding}</span>
                    <span className="tnum">{formatMoney(item.gain)} gain</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted mt-3">
                Raising your cost this way saves about {formatMoney(harvesting.futureSaving)} of tax when you sell later. Exit loads may apply.
              </p>
            </>
          ) : (
            <p className="text-muted">Nothing to harvest right now.</p>
          )}
        </Card>
      </div>

      <p className="text-sm text-muted mt-6">
        An estimate to help you plan, not tax advice. Check with a chartered accountant before filing.
      </p>

      {editing && <ProfileModal fy={summary.fy} profile={profile} onSaved={load} onClose={() => setEditing(false)} />}
    </>
  );
}
