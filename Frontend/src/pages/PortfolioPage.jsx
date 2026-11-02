import React, { useCallback, useEffect, useState } from "react";
import { FileUp, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import { formatDayMonth, formatMoney, formatPercent, humanize } from "../lib/format";
import Loaded from "../components/Loaded";
import { AllocationCompare } from "../components/charts";
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  Delta,
  EmptyState,
  Field,
  FormModal,
  IconButton,
  Input,
  Modal,
  PageHeader,
  SectionTitle,
  Select,
  Stat,
  StatStrip,
  Toggle,
  useToast,
} from "../components/ui";
import useNewParam from "../lib/useNewParam";

const FUND_CATEGORIES = ["Equity", "Index", "Debt", "Liquid", "Gold", "Hybrid"];

const OTHER_KINDS = [
  { value: "fd", label: "Fixed deposit" },
  { value: "rd", label: "Recurring deposit" },
  { value: "ppf", label: "PPF" },
  { value: "nps", label: "NPS" },
  { value: "sgb", label: "Sovereign gold bond" },
  { value: "bond", label: "Bond" },
  { value: "other", label: "Other" },
];

const GoalSelect = ({ goals, value, onChange }) => (
  <Field label="Counts towards goal">
    <Select value={value || ""} onChange={(event) => onChange(event.target.value)}>
      <option value="">No goal</option>
      {goals.map((goal) => (
        <option key={goal.id} value={goal.id}>{goal.name}</option>
      ))}
    </Select>
  </Field>
);

// Suggests AMFI schemes as the user types, so NAVs can be fetched daily
const FundSearch = ({ value, onChange, onPick }) => {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || value.trim().length < 3) {
      setResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api(`/investments/funds/search?q=${encodeURIComponent(value.trim())}`);
        setResults(data);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value, open]);

  return (
    <div className="relative">
      <Input
        required
        value={value}
        autoComplete="off"
        placeholder="Start typing, e.g. Parag Parikh Flexi"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-surface border border-line rounded-lg shadow-sm">
          {results.map((scheme) => (
            <li key={scheme.code}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-wash"
                onMouseDown={() => {
                  onPick(scheme);
                  setOpen(false);
                }}
              >
                <span className="block text-sm">{scheme.name}</span>
                <span className="block text-xs text-muted tnum">NAV ₹{scheme.nav} on {scheme.date}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const fundCategory = (text = "") => {
  if (/gold/i.test(text)) return "Gold";
  if (/index|etf/i.test(text)) return "Index";
  if (/liquid|overnight|money market/i.test(text)) return "Liquid";
  if (/hybrid|balanced|arbitrage/i.test(text)) return "Hybrid";
  if (/debt|bond|gilt|duration|credit|banking and psu/i.test(text)) return "Debt";
  return "Equity";
};

const HoldingModal = ({ holding, goals, onClose }) => {
  const { refresh } = useData();
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    kind: holding?.kind || "mutual_fund",
    name: holding?.name || "",
    symbol: holding?.symbol || "",
    amfi_code: holding?.amfiCode || "",
    sector: holding?.kind === "stock" ? holding.detail || "" : "",
    category: holding?.kind === "mutual_fund" ? holding.detail || "Equity" : "Equity",
    quantity: holding?.quantity ?? "",
    invested: holding ? Math.round(holding.invested) : "",
    purchase_date: holding?.purchaseDate || "",
    manual: holding?.priceSource === "manual",
    current_value: holding?.value ?? "",
    sip_amount: holding?.sip?.amount || "",
    sip_day: holding?.sip?.day || "",
    goal_id: holding?.goalId || "",
  }));

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const isStock = form.kind === "stock";

  const submit = async () => {
    const shared = {
      purchase_date: form.purchase_date || undefined,
      price_source: form.manual ? "manual" : "live",
      current_value: form.manual ? Number(form.current_value) : undefined,
      goal_id: form.goal_id || null,
    };
    const body = isStock
      ? {
          ...shared,
          symbol: form.symbol.trim().toUpperCase(),
          company_name: form.name.trim(),
          quantity: Number(form.quantity),
          purchase_price: Number(form.quantity) ? Number(form.invested) / Number(form.quantity) : 0,
          sector: form.sector.trim(),
        }
      : {
          ...shared,
          scheme_name: form.name.trim(),
          amfi_code: form.amfi_code || undefined,
          units: Number(form.quantity),
          invested_amount: Number(form.invested) || 0,
          category: form.category,
          sip: form.sip_amount ? { amount: Number(form.sip_amount), day: Number(form.sip_day) } : { amount: 0 },
        };

    if (holding) {
      await api(`/investments/${holding.kind}/${holding.id}`, { method: "PUT", body });
    } else {
      await api("/investments", { method: "POST", body: { type: form.kind, ...body } });
    }
    await refresh();
    toast.success(holding ? "Holding updated" : "Holding added");
  };

  return (
    <FormModal
      title={holding ? "Edit holding" : "Add stock or fund"}
      submitLabel={holding ? "Save changes" : "Add holding"}
      onSubmit={submit}
      onClose={onClose}
    >
      {!holding && (
        <Field label="Type">
          <Select value={form.kind} onChange={set("kind")}>
            <option value="mutual_fund">Mutual fund</option>
            <option value="stock">Stock</option>
          </Select>
        </Field>
      )}
      {isStock ? (
        <>
          <Field label="Company">
            <Input required value={form.name} onChange={set("name")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="NSE symbol">
              <Input required value={form.symbol} onChange={set("symbol")} placeholder="e.g. INFY" />
            </Field>
            <Field label="Sector">
              <Input value={form.sector} onChange={set("sector")} />
            </Field>
          </div>
        </>
      ) : (
        <>
          <Field label="Scheme">
            <FundSearch
              value={form.name}
              onChange={(name) => setForm((current) => ({ ...current, name, amfi_code: "" }))}
              onPick={(scheme) =>
                setForm((current) => ({ ...current, name: scheme.name, amfi_code: scheme.code, category: fundCategory(`${scheme.category} ${scheme.name}`) }))
              }
            />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={set("category")}>
              {FUND_CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </Select>
          </Field>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={isStock ? "Shares" : "Units"}>
          <Input required type="number" min="0" step="any" value={form.quantity} onChange={set("quantity")} />
        </Field>
        <Field label="Amount invested">
          <Input type="number" min="0" step="any" value={form.invested} onChange={set("invested")} />
        </Field>
      </div>
      <Field label={isStock ? "Bought on" : "First invested on"} hint="Needed for the yearly return and the Nifty 50 comparison.">
        <Input type="date" value={form.purchase_date} onChange={set("purchase_date")} />
      </Field>
      {!isStock && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly SIP">
            <Input type="number" min="0" value={form.sip_amount} onChange={set("sip_amount")} placeholder="None" />
          </Field>
          <Field label="SIP date">
            <Input type="number" min="1" max="28" required={!!form.sip_amount} value={form.sip_day} onChange={set("sip_day")} placeholder="1 to 28" />
          </Field>
        </div>
      )}
      <GoalSelect goals={goals} value={form.goal_id} onChange={(goal_id) => setForm({ ...form, goal_id })} />
      <Toggle
        checked={form.manual}
        onChange={(manual) => setForm({ ...form, manual })}
        label="Enter the value myself"
        description={isStock ? "Otherwise the NSE price is fetched each day." : "Otherwise the AMFI NAV is fetched each day."}
      />
      {form.manual && (
        <Field label="Current value">
          <Input required type="number" min="0" step="any" value={form.current_value} onChange={set("current_value")} />
        </Field>
      )}
    </FormModal>
  );
};

const OtherModal = ({ item, goals, onClose }) => {
  const { refresh } = useData();
  const toast = useToast();
  const raw = item?.raw || {};
  const [form, setForm] = useState({
    kind: raw.kind || "fd",
    name: raw.name || "",
    institution: raw.institution || "",
    principal: raw.principal ?? "",
    monthly_deposit: raw.monthly_deposit ?? "",
    rate: raw.rate ?? "",
    start_date: raw.start_date || "",
    maturity_date: raw.maturity_date || "",
    current_value: raw.current_value ?? "",
    equity_share: raw.equity_share ?? "",
    grams: raw.grams ?? "",
    goal_id: raw.goal_id || "",
  });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const byRate = ["fd", "rd", "bond"].includes(form.kind);

  const submit = async () => {
    const body = Object.fromEntries(
      Object.entries({ ...form, goal_id: form.goal_id || null }).filter(([, value]) => value !== ""),
    );
    if (item) await api(`/investments/other/${item.id}`, { method: "PUT", body });
    else await api("/investments/other", { method: "POST", body });
    await refresh();
    toast.success(item ? "Investment updated" : "Investment added");
  };

  return (
    <FormModal
      title={item ? "Edit investment" : "Add deposit, PPF, NPS or bond"}
      submitLabel={item ? "Save changes" : "Add investment"}
      onSubmit={submit}
      onClose={onClose}
    >
      <Field label="Type">
        <Select value={form.kind} onChange={set("kind")} disabled={!!item}>
          {OTHER_KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>{kind.label}</option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name">
          <Input value={form.name} onChange={set("name")} placeholder="Optional" />
        </Field>
        <Field label="Bank or provider">
          <Input value={form.institution} onChange={set("institution")} />
        </Field>
      </div>
      {byRate ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {form.kind === "rd" ? (
              <Field label="Monthly deposit">
                <Input required type="number" min="0" value={form.monthly_deposit} onChange={set("monthly_deposit")} />
              </Field>
            ) : (
              <Field label="Amount">
                <Input required type="number" min="0" value={form.principal} onChange={set("principal")} />
              </Field>
            )}
            <Field label="Interest rate (%)">
              <Input required type="number" min="0" step="0.01" value={form.rate} onChange={set("rate")} />
            </Field>
            <Field label="Start date">
              <Input required type="date" value={form.start_date} onChange={set("start_date")} />
            </Field>
            <Field label="Maturity date">
              <Input type="date" value={form.maturity_date} onChange={set("maturity_date")} />
            </Field>
          </div>
          <p className="text-sm text-muted">The value is worked out from the rate, compounding quarterly.</p>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Current value">
            <Input required type="number" min="0" value={form.current_value} onChange={set("current_value")} />
          </Field>
          {form.kind === "nps" && (
            <Field label="Equity share (%)">
              <Input type="number" min="0" max="100" value={form.equity_share} onChange={set("equity_share")} />
            </Field>
          )}
          {form.kind === "sgb" && (
            <Field label="Grams">
              <Input type="number" min="0" step="any" value={form.grams} onChange={set("grams")} />
            </Field>
          )}
          {form.kind !== "nps" && form.kind !== "sgb" && (
            <Field label="Amount put in">
              <Input type="number" min="0" value={form.principal} onChange={set("principal")} />
            </Field>
          )}
        </div>
      )}
      <GoalSelect goals={goals} value={form.goal_id} onChange={(goal_id) => setForm({ ...form, goal_id })} />
    </FormModal>
  );
};

const EpfModal = ({ epf, onClose }) => {
  const { refresh } = useData();
  const toast = useToast();
  const [form, setForm] = useState({
    uan: epf?.uan || "",
    total_balance: epf?.total_balance ?? "",
    employee_contribution: epf?.employee_contribution ?? "",
    employer_contribution: epf?.employer_contribution ?? "",
  });
  const set = (key) => (event) =>
    setForm({ ...form, [key]: event.target.value });

  return (
    <FormModal
      title="EPF details"
      submitLabel="Save EPF"
      onClose={onClose}
      onSubmit={async () => {
        await api("/wealth/epf", { method: "PUT", body: form });
        await refresh();
        toast.success("EPF saved");
      }}
    >
      <Field label="UAN">
        <Input value={form.uan} onChange={set("uan")} />
      </Field>
      <Field label="Current balance">
        <Input required type="number" min="0" value={form.total_balance} onChange={set("total_balance")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Your monthly share">
          <Input type="number" min="0" value={form.employee_contribution} onChange={set("employee_contribution")} />
        </Field>
        <Field label="Employer's monthly share">
          <Input type="number" min="0" value={form.employer_contribution} onChange={set("employer_contribution")} />
        </Field>
      </div>
    </FormModal>
  );
};

const SOURCE_LABELS = {
  cams: "CAMS or KFintech statement",
  depository: "NSDL or CDSL statement",
  ai: "statement read by AI",
};

const StatementModal = ({ onClose }) => {
  const { refresh } = useData();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const read = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Choose your statement as a PDF file");
      return;
    }

    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("statement", file);
    form.append("password", password);
    try {
      const { data } = await api("/investments/statement/preview", { method: "POST", form });
      setResult(data);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { added, updated } = await api("/investments/statement/import", {
        method: "POST",
        body: { funds: result.funds, stocks: result.stocks },
      });
      await refresh();
      toast.success(`Added ${added} holdings and updated ${updated}`);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (result) {
    const rows = [
      ...result.funds.map((fund) => ({ key: `f-${fund.isin || fund.scheme_name}`, name: fund.scheme_name, detail: fund.category, value: fund.current_value })),
      ...result.stocks.map((stock) => ({ key: `s-${stock.isin || stock.company_name}`, name: stock.company_name, detail: stock.symbol || "Stock", value: stock.current_value })),
    ];
    const total = rows.reduce((sum, row) => sum + (row.value || 0), 0);
    return (
      <Modal
        title="Check these holdings"
        description={`${rows.length} holdings worth ${formatMoney(total)}, from a ${SOURCE_LABELS[result.source] || "statement"}. Ones you already hold are updated, not added twice.`}
        onClose={onClose}
      >
        <ul className="divide-y divide-line border-y border-line max-h-72 overflow-y-auto mb-4">
          {rows.map((row) => (
            <li key={row.key} className="py-2.5">
              <p className="font-medium">{row.name}</p>
              <p className="flex justify-between gap-4 text-sm text-muted tnum">
                <span>{row.detail}</span>
                <span>{formatMoney(row.value)}</span>
              </p>
            </li>
          ))}
        </ul>
        {result.source === "ai" && (
          <p className="text-sm text-muted mb-4">This layout was read by AI, so check the figures before importing.</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-loss mb-4">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setResult(null)}>Back</Button>
          <Button disabled={busy || !rows.length} onClick={save}>Import {rows.length} holdings</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Import a statement"
      description="A CAMS or KFintech statement for mutual funds, or an NSDL or CDSL statement for shares. It's read once and never stored."
      onClose={onClose}
    >
      <form onSubmit={read} className="space-y-4">
        <Field label="Statement">
          <Input
            type="file"
            accept=".pdf"
            className="!h-auto py-2"
            onChange={(event) => setFile(event.target.files[0] || null)}
          />
        </Field>
        <Field label="Statement password" hint="Usually your PAN, or what you set when you requested it. Leave it blank if the PDF isn't locked.">
          <Input
            type="password"
            autoComplete="off"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-loss">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Reading..." : "Read statement"}</Button>
        </div>
      </form>
    </Modal>
  );
};

const RebalancePlan = ({ plan, monthlySavings }) => {
  const reductions = plan.moves.filter((move) => move.action === "reduce");
  const additions = plan.moves.filter((move) => move.action === "add");
  const monthsOfSaving =
    monthlySavings > 0 ? Math.ceil(plan.newMoney.total / monthlySavings) : null;

  return (
    <Card className="p-5 mb-6">
      <SectionTitle
        title="Rebalancing plan"
        description="Two ways back to your target mix. Choose funds yourself; this only covers asset classes."
      />
      {plan.onTarget ? (
        <p className="text-muted">
          You're within a few points of your target, so there's nothing to do.
        </p>
      ) : (
        <div className="grid @2xl:grid-cols-2 gap-8">
          <div>
            <h3 className="font-medium mb-2">Move what you already hold</h3>
            {plan.moves.length ? (
              <ul className="divide-y divide-line">
                {[...reductions, ...additions].map((move) => (
                  <li key={`${move.action}-${move.key}`} className="flex justify-between gap-4 py-2">
                    <span>
                      {move.action === "reduce" ? "Reduce" : "Add to"} {move.label.toLowerCase()}
                    </span>
                    <span className="tnum">{formatMoney(move.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">There's nothing here you can move yet.</p>
            )}
            <p className="text-sm text-muted mt-2">
              Selling can trigger capital gains tax and exit loads.
              {plan.limitedByEpf && " Your EPF can't be moved, so the debt reduction is limited to your funds."}
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Or use new money only</h3>
            <ul className="divide-y divide-line">
              {plan.newMoney.split.map((move) => (
                <li key={move.key} className="flex justify-between gap-4 py-2">
                  <span>Invest in {move.label.toLowerCase()}</span>
                  <span className="tnum">{formatMoney(move.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted mt-2">
              {formatMoney(plan.newMoney.total)} in total, with nothing sold.
              {monthsOfSaving !== null &&
                ` About ${monthsOfSaving} ${monthsOfSaving === 1 ? "month" : "months"} of your current saving.`}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

const SipTracker = ({ sips }) => {
  const total = sips.reduce((sum, sip) => sum + sip.amount, 0);
  const month = new Date().getMonth();
  // March and April: the start of the financial year, when pay rises land
  const stepUpSeason = month === 2 || month === 3;

  return (
    <Card className="p-5">
      <SectionTitle title="SIPs" description={`${formatMoney(total)} a month across ${sips.length} ${sips.length === 1 ? "fund" : "funds"}.`} />
      <ul className="divide-y divide-line">
        {sips.map((sip) => (
          <li key={sip.name} className="py-2.5">
            <div className="flex justify-between gap-4">
              <span className="font-medium min-w-0">{sip.name}</span>
              <span className="tnum shrink-0">{formatMoney(sip.amount)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted mt-0.5">
              <span>Next on {formatDayMonth(sip.next)}</span>
              {sip.missed?.length > 0 && (
                <Badge tone="warn">
                  {sip.missed.length === 1 ? `Missed ${formatDayMonth(sip.missed[0])}` : `${sip.missed.length} missed`}
                </Badge>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted mt-3">
        {stepUpSeason
          ? `A new financial year: raising every SIP by 10% would add ${formatMoney(total * 0.1)} a month.`
          : "Missed means no instalment showed up in your fund's transactions within five days of the date."}
      </p>
    </Card>
  );
};

const ReturnsCard = ({ returns, pricesAsOf, onRefresh, refreshing }) => {
  const { benchmark } = returns;
  return (
    <Card className="p-5">
      <SectionTitle title="Returns" description="Yearly return (XIRR) on the money you put in, by date.">
        <Button size="sm" variant="secondary" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Updating" : "Update prices"}
        </Button>
      </SectionTitle>
      {returns.xirr === null ? (
        <p className="text-muted">Add buy dates to your holdings to see your yearly return.</p>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <Stat label="Your portfolio" value={formatPercent(returns.xirr)} />
          <Stat label="Nifty 50 on the same dates" value={benchmark ? formatPercent(benchmark.xirr) : "Loading"}>
            {benchmark && (
              <span className={benchmark.difference >= 0 ? "text-gain" : "text-loss"}>
                {benchmark.difference >= 0
                  ? `You're ${formatMoney(benchmark.difference)} ahead of the index`
                  : `The index would be ${formatMoney(-benchmark.difference)} ahead`}
              </span>
            )}
          </Stat>
        </div>
      )}
      <p className="text-sm text-muted mt-4">
        {pricesAsOf ? `Prices as of ${formatDayMonth(pricesAsOf)}. NAVs from AMFI, share prices from NSE via Yahoo Finance.` : "Prices haven't been fetched yet."}
      </p>
    </Card>
  );
};

export default function PortfolioPage() {
  const { user } = useAuth();
  const { refresh } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [editingOther, setEditingOther] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [editingEpf, setEditingEpf] = useState(false);
  const [importing, setImporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  useNewParam("investment", useCallback(() => setAdding(true), []));

  const refreshPrices = async () => {
    setRefreshing(true);
    try {
      const { data } = await api("/investments/refresh-prices", { method: "POST" });
      await refresh();
      toast.success(`Updated ${data.funds || 0} funds and ${data.stocks || 0} stocks`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Loaded>
      {({ portfolio, retirement, cashflow, goals }) => {
        const goalName = Object.fromEntries(goals.map((goal) => [goal.id, goal.name]));
        return (
          <>
            <PageHeader
              title="Investments"
              description={`Funds, shares and deposits at today's prices, against your ${user.investorProfile.riskLabel.toLowerCase()} target mix.`}
            >
              <Button variant="secondary" onClick={() => setImporting(true)}>
                <FileUp size={16} /> Import statement
              </Button>
              <Button onClick={() => setAdding(true)}>
                <Plus size={16} /> Add investment
              </Button>
            </PageHeader>

            <StatStrip>
              <Stat label="Current value" value={formatMoney(portfolio.value)} />
              <Stat label="Invested" value={formatMoney(portfolio.invested)} />
              <Stat label="Gain" value={<Delta value={portfolio.gain} className="!font-semibold" />}>
                <span className="text-muted tnum">
                  {portfolio.invested > 0 ? `${formatPercent(portfolio.gainPercent)} on cost` : "Add buy prices to see this"}
                </span>
              </Stat>
              <Stat label="Yearly return" value={portfolio.returns.xirr === null ? "Not known" : formatPercent(portfolio.returns.xirr)}>
                {portfolio.returns.benchmark && (
                  <span className="text-muted tnum">Nifty 50: {formatPercent(portfolio.returns.benchmark.xirr)}</span>
                )}
              </Stat>
            </StatStrip>

            <div className="grid @3xl:grid-cols-2 gap-6 mb-6">
              <ReturnsCard returns={portfolio.returns} pricesAsOf={portfolio.pricesAsOf} onRefresh={refreshPrices} refreshing={refreshing} />
              {portfolio.sips.length > 0 ? (
                <SipTracker sips={portfolio.sips} />
              ) : (
                <Card className="p-5">
                  <SectionTitle title="SIPs" />
                  <p className="text-muted">Add a monthly SIP to a fund to track upcoming and missed instalments here.</p>
                </Card>
              )}
            </div>

            <div className="grid @3xl:grid-cols-5 gap-6 mb-6">
              <Card className="@3xl:col-span-3 p-5">
                <SectionTitle title="Mix against your target" description="Includes your EPF balance as debt.">
                  {portfolio.drift >= 10 && <Badge tone="warn">{portfolio.drift} points off target</Badge>}
                </SectionTitle>
                <AllocationCompare allocation={portfolio.allocation} />
              </Card>
              <Card className="@3xl:col-span-2 p-5">
                <SectionTitle title="Provident fund">
                  <Button size="sm" variant="secondary" onClick={() => setEditingEpf(true)}>
                    {retirement ? "Edit" : "Add EPF"}
                  </Button>
                </SectionTitle>
                {retirement ? (
                  <>
                    <p className="text-3xl font-semibold tnum tracking-tight">{formatMoney(retirement.total_balance)}</p>
                    <dl className="text-sm mt-4 space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-muted">Your monthly share</dt>
                        <dd className="tnum">{formatMoney(retirement.employee_contribution)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Employer's monthly share</dt>
                        <dd className="tnum">{formatMoney(retirement.employer_contribution)}</dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <p className="text-muted">Add your EPF balance so it counts towards your net worth and debt allocation.</p>
                )}
              </Card>
            </div>

            {portfolio.rebalance && (
              <RebalancePlan plan={portfolio.rebalance} monthlySavings={cashflow.forecast.monthlySavings} />
            )}

            <Card>
              <div className="p-5 pb-3">
                <SectionTitle title="Holdings" />
              </div>
              {portfolio.holdings.length === 0 ? (
                <EmptyState title="No holdings yet" description="Import a statement, or add your investments by hand.">
                  <Button onClick={() => setImporting(true)}>Import statement</Button>
                  <Button variant="secondary" onClick={() => setAdding(true)}>Add investment</Button>
                </EmptyState>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="text-left text-sm text-muted border-y border-line">
                        <th className="px-5 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Class</th>
                        <th className="px-3 py-2 font-medium text-right">Value</th>
                        <th className="px-3 py-2 font-medium text-right">Gain</th>
                        <th className="px-3 py-2 font-medium text-right">Yearly return</th>
                        <th className="px-3 py-2 font-medium text-right">Weight</th>
                        <th className="px-5 py-2"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.holdings.map((holding) => (
                        <tr key={holding.id} className="border-b border-line last:border-0">
                          <td className="px-5 py-3">
                            <p className="font-medium">{holding.name}</p>
                            <p className="text-sm text-muted flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span>{holding.detail || humanize(holding.kind)}</span>
                              {holding.priceSource === "manual" && <Badge>Value entered by you</Badge>}
                              {holding.goalId && goalName[holding.goalId] && <Badge tone="accent">{goalName[holding.goalId]}</Badge>}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-muted">{humanize(holding.assetClass)}</td>
                          <td className="px-3 py-3 text-right tnum">{formatMoney(holding.value)}</td>
                          <td className="px-3 py-3 text-right">
                            {holding.gain === null ? <span className="text-muted">Not known</span> : <Delta value={holding.gain} />}
                          </td>
                          <td className="px-3 py-3 text-right tnum">
                            {holding.xirr === null || holding.xirr === undefined ? <span className="text-muted">Not known</span> : formatPercent(holding.xirr)}
                          </td>
                          <td className="px-3 py-3 text-right tnum text-muted">{holding.weight}%</td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-0.5">
                              <IconButton
                                label={`Edit ${holding.name}`}
                                onClick={() => (holding.kind === "other" ? setEditingOther(holding) : setEditing(holding))}
                              >
                                <Pencil size={15} />
                              </IconButton>
                              <IconButton label={`Remove ${holding.name}`} onClick={() => setRemoving(holding)}>
                                <Trash2 size={15} />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {adding && (
              <Modal title="Add an investment" onClose={() => setAdding(false)}>
                <div className="grid gap-2">
                  <Button variant="secondary" className="!justify-start" onClick={() => { setAdding(false); setEditing("new"); }}>
                    Stock or mutual fund
                  </Button>
                  <Button variant="secondary" className="!justify-start" onClick={() => { setAdding(false); setEditingOther("new"); }}>
                    FD, RD, PPF, NPS, gold bond or bond
                  </Button>
                </div>
              </Modal>
            )}
            {editing && (
              <HoldingModal holding={editing === "new" ? null : editing} goals={goals} onClose={() => setEditing(null)} />
            )}
            {editingOther && (
              <OtherModal item={editingOther === "new" ? null : editingOther} goals={goals} onClose={() => setEditingOther(null)} />
            )}
            {importing && <StatementModal onClose={() => setImporting(false)} />}
            {editingEpf && <EpfModal epf={retirement} onClose={() => setEditingEpf(false)} />}
            {removing && (
              <ConfirmModal
                title={`Remove ${removing.name}?`}
                description="This removes it from your portfolio."
                action="Remove"
                onClose={() => setRemoving(null)}
                onConfirm={async () => {
                  const path = removing.kind === "other" ? `/investments/other/${removing.id}` : `/investments/${removing.kind}/${removing.id}`;
                  await api(path, { method: "DELETE" });
                  await refresh();
                  toast.success("Removed");
                }}
              />
            )}
          </>
        );
      }}
    </Loaded>
  );
}
