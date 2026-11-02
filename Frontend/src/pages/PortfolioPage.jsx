import React, { useState } from "react";
import { FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import { formatMoney, formatPercent, humanize } from "../lib/format";
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
  useToast,
} from "../components/ui";

const BLANK = {
  kind: "stock",
  symbol: "",
  company_name: "",
  quantity: "",
  purchase_price: "",
  current_value: "",
  sector: "",
  scheme_name: "",
  scheme_code: "",
  units: "",
  invested_amount: "",
  category: "Equity",
};

const FUND_CATEGORIES = ["Equity", "Index", "Debt", "Liquid", "Gold", "Hybrid"];

const HoldingModal = ({ holding, onClose }) => {
  const { refresh } = useData();
  const toast = useToast();
  const [form, setForm] = useState(
    holding
      ? {
          ...BLANK,
          kind: holding.kind,
          symbol: holding.symbol || "",
          company_name: holding.name,
          scheme_name: holding.name,
          scheme_code: holding.symbol || "",
          quantity: holding.quantity,
          units: holding.quantity,
          current_value: holding.value,
          purchase_price: holding.quantity
            ? holding.invested / holding.quantity
            : "",
          invested_amount: holding.invested,
          sector: holding.detail || "",
          category: holding.detail || "Equity",
        }
      : BLANK,
  );

  const set = (key) => (event) =>
    setForm({ ...form, [key]: event.target.value });
  const isStock = form.kind === "stock";

  const submit = async () => {
    const shared = { current_value: Number(form.current_value) };
    const body = isStock
      ? {
          ...shared,
          symbol: form.symbol.trim().toUpperCase(),
          company_name: form.company_name.trim(),
          quantity: Number(form.quantity),
          purchase_price: Number(form.purchase_price) || 0,
          sector: form.sector.trim(),
        }
      : {
          ...shared,
          scheme_name: form.scheme_name.trim(),
          scheme_code: form.scheme_code.trim(),
          units: Number(form.units),
          invested_amount: Number(form.invested_amount) || 0,
          category: form.category,
        };

    if (holding) {
      await api(`/investments/${holding.kind}/${holding.id}`, {
        method: "PUT",
        body,
      });
    } else {
      await api("/investments", {
        method: "POST",
        body: { type: form.kind, ...body },
      });
    }
    await refresh();
    toast.success(holding ? "Holding updated" : "Holding added");
  };

  return (
    <FormModal
      title={holding ? "Edit holding" : "Add holding"}
      submitLabel={holding ? "Save changes" : "Add holding"}
      onSubmit={submit}
      onClose={onClose}
    >
      {!holding && (
        <Field label="Type">
          <Select value={form.kind} onChange={set("kind")}>
            <option value="stock">Stock</option>
            <option value="mutual_fund">Mutual fund</option>
          </Select>
        </Field>
      )}
      {isStock ? (
        <>
          <Field label="Company">
            <Input required value={form.company_name} onChange={set("company_name")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Symbol">
              <Input required value={form.symbol} onChange={set("symbol")} />
            </Field>
            <Field label="Sector">
              <Input value={form.sector} onChange={set("sector")} />
            </Field>
            <Field label="Shares">
              <Input required type="number" min="0" step="any" value={form.quantity} onChange={set("quantity")} />
            </Field>
            <Field label="Average buy price">
              <Input type="number" min="0" step="any" value={form.purchase_price} onChange={set("purchase_price")} />
            </Field>
          </div>
        </>
      ) : (
        <>
          <Field label="Scheme name">
            <Input required value={form.scheme_name} onChange={set("scheme_name")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={form.category} onChange={set("category")}>
                {FUND_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </Select>
            </Field>
            <Field label="Units">
              <Input required type="number" min="0" step="any" value={form.units} onChange={set("units")} />
            </Field>
          </div>
          <Field label="Amount invested">
            <Input type="number" min="0" step="any" value={form.invested_amount} onChange={set("invested_amount")} />
          </Field>
        </>
      )}
      <Field label="Current value" hint="Update this when you want the latest value. Prices aren't fetched automatically.">
        <Input required type="number" min="0" step="any" value={form.current_value} onChange={set("current_value")} />
      </Field>
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

const StatementModal = ({ onClose }) => {
  const { refresh } = useData();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [funds, setFunds] = useState(null);
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
      const { data } = await api("/investments/statement/preview", {
        method: "POST",
        form,
      });
      setFunds(data);
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
        body: { funds },
      });
      await refresh();
      toast.success(`Added ${added} funds and updated ${updated}`);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (funds) {
    const total = funds.reduce((sum, fund) => sum + fund.current_value, 0);
    return (
      <Modal
        title="Check these funds"
        description={`${funds.length} funds worth ${formatMoney(total)}. Funds you already hold are updated, not added twice.`}
        onClose={onClose}
      >
        <ul className="divide-y divide-line border-y border-line max-h-72 overflow-y-auto mb-4">
          {funds.map((fund) => (
            <li key={fund.scheme_code || fund.scheme_name} className="py-2.5">
              <p className="font-medium">{fund.scheme_name}</p>
              <p className="flex justify-between gap-4 text-sm text-muted tnum">
                <span>{fund.category}</span>
                <span>{formatMoney(fund.current_value)}</span>
              </p>
            </li>
          ))}
        </ul>
        {funds.some((fund) => !fund.invested_amount) && (
          <p className="text-sm text-muted mb-4">
            Some funds show no purchase cost in this statement, so their gain
            will show as not known.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-loss mb-4">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setFunds(null)}>
            Back
          </Button>
          <Button disabled={busy} onClick={save}>
            Import {funds.length} funds
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Import mutual fund statement"
      description="Use the consolidated account statement PDF from CAMS or KFintech. It's read once and never stored."
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
        <Field label="Statement password" hint="You set this when you requested the statement. Leave it blank if the PDF isn't locked.">
          <Input
            type="password"
            autoComplete="off"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-loss">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Reading..." : "Read statement"}
          </Button>
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
        <>
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
                <p className="text-muted">
                  There's nothing here you can move yet.
                </p>
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
        </>
      )}
    </Card>
  );
};

export default function PortfolioPage() {
  const { user } = useAuth();
  const { refresh } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [editingEpf, setEditingEpf] = useState(false);
  const [importing, setImporting] = useState(false);

  return (
    <Loaded>
      {({ portfolio, retirement, cashflow }) => (
        <>
          <PageHeader
            title="Portfolio"
            description={`Your ${user.investorProfile.riskLabel.toLowerCase()} profile, as you hold it today.`}
          >
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <FileUp size={16} /> Import statement
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} /> Add holding
            </Button>
          </PageHeader>

          <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-6 mb-8">
            <Stat label="Current value" value={formatMoney(portfolio.value)} />
            <Stat label="Invested" value={formatMoney(portfolio.invested)} />
            <Stat label="Gain" value={<Delta value={portfolio.gain} className="!font-semibold" />}>
              <span className="text-muted tnum">
                {portfolio.invested > 0
                  ? `${formatPercent(portfolio.gainPercent)} on cost`
                  : "Add buy prices to see this"}
              </span>
            </Stat>
            <Stat label="Holdings" value={portfolio.holdings.length} />
          </div>

          <div className="grid @3xl:grid-cols-5 gap-6 mb-6">
            <Card className="@3xl:col-span-3 p-5">
              <SectionTitle
                title="Mix against your target"
                description="Includes your EPF balance as debt."
              >
                {portfolio.drift >= 10 && (
                  <Badge tone="warn">{portfolio.drift} points off target</Badge>
                )}
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
                  <p className="text-3xl font-semibold tnum tracking-tight">
                    {formatMoney(retirement.total_balance)}
                  </p>
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
                <p className="text-muted">
                  Add your EPF balance so it counts towards your net worth and
                  debt allocation.
                </p>
              )}
            </Card>
          </div>

          {portfolio.rebalance && (
            <RebalancePlan
              plan={portfolio.rebalance}
              monthlySavings={cashflow.forecast.monthlySavings}
            />
          )}

          <Card>
            <div className="p-5 pb-3">
              <SectionTitle title="Holdings" />
            </div>
            {portfolio.holdings.length === 0 ? (
              <EmptyState
                title="No holdings yet"
                description="Import a mutual fund statement, or add your holdings by hand."
              >
                <Button onClick={() => setImporting(true)}>Import statement</Button>
                <Button variant="secondary" onClick={() => setEditing("new")}>Add holding</Button>
              </EmptyState>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="text-left text-sm text-muted border-y border-line">
                      <th className="px-5 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Class</th>
                      <th className="px-3 py-2 font-medium text-right">Value</th>
                      <th className="px-3 py-2 font-medium text-right">Gain</th>
                      <th className="px-3 py-2 font-medium text-right">Weight</th>
                      <th className="px-5 py-2"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.holdings.map((holding) => (
                      <tr key={holding.id} className="border-b border-line last:border-0 group">
                        <td className="px-5 py-3">
                          <p className="font-medium">{holding.name}</p>
                          <p className="text-sm text-muted">{holding.detail || humanize(holding.kind)}</p>
                        </td>
                        <td className="px-3 py-3 text-muted">{humanize(holding.assetClass)}</td>
                        <td className="px-3 py-3 text-right tnum">{formatMoney(holding.value)}</td>
                        <td className="px-3 py-3 text-right">
                          {holding.gain === null ? (
                            <span className="text-muted">Not known</span>
                          ) : (
                            <Delta value={holding.gain} />
                          )}
                        </td>
                        <td className="px-3 py-3 text-right tnum text-muted">{holding.weight}%</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-0.5">
                            <IconButton label={`Edit ${holding.name}`} onClick={() => setEditing(holding)}>
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

          {editing && (
            <HoldingModal
              holding={editing === "new" ? null : editing}
              onClose={() => setEditing(null)}
            />
          )}
          {importing && <StatementModal onClose={() => setImporting(false)} />}
          {editingEpf && (
            <EpfModal epf={retirement} onClose={() => setEditingEpf(false)} />
          )}
          {removing && (
            <ConfirmModal
              title={`Remove ${removing.name}?`}
              description="This removes the holding from your portfolio."
              action="Remove holding"
              onClose={() => setRemoving(null)}
              onConfirm={async () => {
                await api(`/investments/${removing.kind}/${removing.id}`, {
                  method: "DELETE",
                });
                await refresh();
                toast.success("Holding removed");
              }}
            />
          )}
        </>
      )}
    </Loaded>
  );
}
