import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Pencil, Plus, Trash2, Upload, Wand2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import {
  downloadFile,
  formatDate,
  formatMoney,
  today,
  toCsv,
  toDateInput,
} from "../lib/format";
import Loaded from "../components/Loaded";
import { CashFlowChart, SpendingBars } from "../components/charts";
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  ErrorState,
  Field,
  FormModal,
  IconButton,
  Input,
  PageHeader,
  Progress,
  SectionTitle,
  Select,
  Skeleton,
  Stat,
  StatStrip,
  useToast,
} from "../components/ui";
import useNewParam from "../lib/useNewParam";

const PAGE_SIZE = 25;
const CATEGORIES = [
  "Salary",
  "Freelance",
  "Rent",
  "EMI",
  "Investments",
  "Groceries",
  "Dining",
  "Transport",
  "Utilities",
  "Shopping",
  "Entertainment",
  "Healthcare",
  "Travel",
  "Insurance",
  "Education",
  "Personal care",
  "Other",
  "Uncategorised",
];

const TransactionModal = ({ transaction, onClose, onSaved }) => {
  const [form, setForm] = useState(
    transaction
      ? {
          ...transaction,
          amount: Math.abs(transaction.amount),
          description: transaction.description || "",
        }
      : {
          date: today(),
          amount: "",
          type: "expense",
          category: "Groceries",
          description: "",
          account: "",
        },
  );
  const [remember, setRemember] = useState(false);
  const set = (key) => (event) =>
    setForm({ ...form, [key]: event.target.value });
  const changedCategory = transaction && form.category !== transaction.category;

  const categories = CATEGORIES.includes(form.category)
    ? CATEGORIES
    : [form.category, ...CATEGORIES];

  return (
    <FormModal
      title={transaction ? "Edit transaction" : "Add transaction"}
      submitLabel={transaction ? "Save changes" : "Add transaction"}
      onClose={onClose}
      onSubmit={async () => {
        const body = {
          date: form.date,
          type: form.type,
          category: form.category,
          description: form.description,
          account: form.account,
          amount: Number(form.amount),
          remember: changedCategory && remember,
        };
        const result = transaction
          ? await api(`/transactions/${transaction.id}`, { method: "PUT", body })
          : await api("/transactions", { method: "POST", body: { ...body, category: form.category === "Uncategorised" ? "" : form.category } });
        await onSaved(
          result.applied
            ? `Saved. ${result.applied} similar ${result.applied === 1 ? "transaction was" : "transactions were"} moved too.`
            : transaction ? "Transaction updated" : "Transaction added",
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={form.type} onChange={set("type")}>
            <option value="expense">Spending</option>
            <option value="income">Income</option>
          </Select>
        </Field>
        <Field label="Amount">
          <Input required type="number" min="0.01" step="any" value={form.amount} onChange={set("amount")} />
        </Field>
        <Field label="Date">
          <Input required type="date" value={form.date} onChange={set("date")} />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={set("category")}>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Description">
        <Input required value={form.description} onChange={set("description")} />
      </Field>
      {changedCategory && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          Always put transactions like this in {form.category}
        </label>
      )}
      {!transaction && form.category === "Uncategorised" && (
        <p className="text-sm text-muted">Munim will pick a category from the description.</p>
      )}
    </FormModal>
  );
};

const TransactionsTab = () => {
  const { user } = useAuth();
  const { refresh } = useData();
  const toast = useToast();
  const [params] = useSearchParams();
  const [rows, setRows] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState(params.get("q") || "");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef(null);
  useNewParam("transaction", useCallback(() => setEditing("new"), []));

  const load = useCallback(async () => {
    try {
      const { data } = await api("/transactions");
      setRows(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(error.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setQuery(params.get("q") || "");
  }, [params]);

  const afterChange = async (message) => {
    await Promise.all([load(), refresh()]);
    toast.success(message);
  };

  const categories = useMemo(
    () => [...new Set((rows || []).map((row) => row.category))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (rows || [])
      .filter(
        (row) =>
          (type === "all" || row.type === type) &&
          (category === "all" || row.category === category) &&
          (!term ||
            `${row.description} ${row.category}`.toLowerCase().includes(term)),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [rows, query, type, category]);

  useEffect(() => setPage(1), [query, type, category]);

  const visible = filtered.slice(0, page * PAGE_SIZE);

  const handleImport = async (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;

    setImporting(true);
    const form = new FormData();
    form.append("files", file);
    try {
      const result = await api("/ingest/excel?target=transactions", {
        method: "POST",
        form,
      });
      await Promise.all([load(), refresh()]);
      const sorted = result.categorized ? result.categorized.rule + result.categorized.keyword + result.categorized.ai : 0;
      toast.success(
        `Imported ${result.inserted} transactions${result.readBy === "ai" ? " (read by AI)" : ""}, ${sorted} sorted automatically. Skipped ${result.skipped}.`,
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setImporting(false);
    }
  };

  const exportCsv = () => {
    downloadFile(
      "munim-transactions.csv",
      toCsv([
        ["Date", "Description", "Category", "Type", "Amount"],
        ...filtered.map((row) => [
          row.date,
          row.description,
          row.category,
          row.type,
          row.amount,
        ]),
      ]),
    );
  };

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if (!rows) return <Skeleton className="h-64" />;

  return (
    <>
      <div className="flex flex-col @3xl:flex-row gap-2 mb-4">
        <Input
          placeholder="Search transactions"
          aria-label="Search transactions"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="@3xl:max-w-xs"
        />
        <Select aria-label="Filter by type" value={type} onChange={(event) => setType(event.target.value)} className="@3xl:w-36">
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Spending</option>
        </Select>
        <Select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className="@3xl:w-44">
          <option value="all">All categories</option>
          {categories.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </Select>
        <div className="flex flex-wrap gap-2 @3xl:ml-auto">
          <Link to="/money/rules" className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium text-muted hover:text-ink hover:bg-wash">
            <Wand2 size={16} /> Rules
          </Link>
          <input ref={fileInput} type="file" hidden accept=".xlsx,.xls,.csv,.pdf" onChange={handleImport} />
          <Button variant="secondary" disabled={importing} onClick={() => fileInput.current.click()}>
            <Upload size={16} /> {importing ? "Importing..." : "Import"}
          </Button>
          <Button variant="secondary" disabled={!filtered.length} onClick={exportCsv}>
            <Download size={16} /> Export
          </Button>
          <Button onClick={() => setEditing("new")}>
            <Plus size={16} /> Add
          </Button>
        </div>
      </div>

      <Card>
        {filtered.length === 0 ? (
          rows.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Import a spreadsheet from your bank, or add one by hand."
            />
          ) : (
            <EmptyState title="Nothing matches these filters" />
          )
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="text-left text-sm text-muted border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Description</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-5 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id || row._id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 tnum text-muted whitespace-nowrap">
                      {formatDate(row.date, user.preferences?.dateFormat)}
                    </td>
                    <td className="px-3 py-2.5">{row.description || "No description"}</td>
                    <td className="px-3 py-2.5 text-muted">{row.category}</td>
                    <td className={`px-3 py-2.5 text-right tnum whitespace-nowrap ${row.type === "income" ? "text-gain" : ""}`}>
                      {row.type === "income" ? "+" : "-"}
                      {formatMoney(Math.abs(row.amount))}
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-0.5">
                        <IconButton label="Edit transaction" onClick={() => setEditing(row)}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton label="Delete transaction" onClick={() => setRemoving(row)}>
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

      <div className="flex items-center justify-between mt-3 text-sm text-muted">
        <span className="tnum">
          Showing {visible.length} of {filtered.length}
        </span>
        {visible.length < filtered.length && (
          <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)}>
            Show more
          </Button>
        )}
      </div>

      {editing && (
        <TransactionModal
          transaction={editing === "new" ? null : editing}
          onSaved={afterChange}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && (
        <ConfirmModal
          title="Delete this transaction?"
          description={`${removing.description || removing.category}, ${formatMoney(Math.abs(removing.amount))}`}
          action="Delete transaction"
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await api(`/transactions/${removing.id}`, { method: "DELETE" });
            await afterChange("Transaction deleted");
          }}
        />
      )}
    </>
  );
};

const monthBounds = () => {
  const now = new Date();
  return {
    startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)),
  };
};

const BudgetModal = ({ budget, onClose }) => {
  const { refresh } = useData();
  const toast = useToast();
  const bounds = monthBounds();
  const [form, setForm] = useState({
    category: budget?.category || "Groceries",
    budgetAmount: budget?.budgetAmount || "",
    period: budget?.period || "monthly",
    startDate: toDateInput(budget?.startDate || bounds.startDate),
    endDate: toDateInput(budget?.endDate || bounds.endDate),
  });
  const set = (key) => (event) =>
    setForm({ ...form, [key]: event.target.value });

  return (
    <FormModal
      title={budget ? "Edit budget" : "Add budget"}
      description="Spending is counted from your transactions in these dates."
      submitLabel={budget ? "Save changes" : "Add budget"}
      onClose={onClose}
      onSubmit={async () => {
        const body = { ...form, budgetAmount: Number(form.budgetAmount) };
        if (budget) {
          await api(`/budgets/${budget.id}`, { method: "PUT", body });
        } else {
          await api("/budgets", { method: "POST", body });
        }
        await refresh();
        toast.success(budget ? "Budget updated" : "Budget added");
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select value={form.category} onChange={set("category")}>
            {CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </Select>
        </Field>
        <Field label="Amount">
          <Input required type="number" min="1" value={form.budgetAmount} onChange={set("budgetAmount")} />
        </Field>
        <Field label="From">
          <Input required type="date" value={form.startDate} onChange={set("startDate")} />
        </Field>
        <Field label="To">
          <Input required type="date" value={form.endDate} onChange={set("endDate")} />
        </Field>
      </div>
      <Field label="Period">
        <Select value={form.period} onChange={set("period")}>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </Select>
      </Field>
    </FormModal>
  );
};

const STATUS = {
  "over-budget": { tone: "loss", label: "Over budget" },
  "on-track": { tone: "warn", label: "Near limit" },
  "under-budget": { tone: "gain", label: "On track" },
};

const BudgetsTab = ({ budgets }) => {
  const { refresh } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  useNewParam("budget", useCallback(() => setEditing("new"), []));

  const total = budgets.reduce((sum, budget) => sum + budget.budgetAmount, 0);
  const spent = budgets.reduce((sum, budget) => sum + budget.spentAmount, 0);
  const over = budgets.filter((budget) => budget.status === "over-budget").length;

  return (
    <>
      <PageHeader description="Limits for the categories you want to watch, counted from your transactions.">
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} /> Add budget
        </Button>
      </PageHeader>
      {budgets.length === 0 ? (
        <Card>
          <EmptyState
            title="No budgets yet"
            description="Set a limit for a category and see how close you are as you spend."
          >
            <Button onClick={() => setEditing("new")}>Add your first budget</Button>
          </EmptyState>
        </Card>
      ) : (
        <>
          <StatStrip>
            <Stat label="Budgeted" value={formatMoney(total)} />
            <Stat label="Spent so far" value={formatMoney(spent)} />
            <Stat label="Left" value={formatMoney(Math.max(total - spent, 0))} />
            <Stat label="Over the limit" value={`${over} of ${budgets.length}`} />
          </StatStrip>
          <Card>
            <ul className="divide-y divide-line">
              {[...budgets].sort((a, b) => b.percentUsed - a.percentUsed).map((budget) => (
                <li key={budget.id} className="grid grid-cols-[1fr_auto] @2xl:grid-cols-[11rem_1fr_9rem_auto] items-center gap-x-5 gap-y-2 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{budget.category}</p>
                    <p className="text-sm text-muted capitalize">{budget.period}</p>
                  </div>
                  <div className="order-last col-span-2 @2xl:order-none @2xl:col-span-1">
                    <Progress
                      value={budget.percentUsed}
                      tone={budget.status === "over-budget" ? "loss" : budget.status === "on-track" ? "accent" : "gain"}
                      label={`${budget.category} budget used`}
                    />
                  </div>
                  <div className="hidden @2xl:block text-right">
                    <p className="tnum">{formatMoney(budget.spentAmount)}</p>
                    <p className="text-sm text-muted tnum">of {formatMoney(budget.budgetAmount)}</p>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <span className="@2xl:hidden text-sm tnum text-muted mr-1">
                      {formatMoney(budget.spentAmount)} / {formatMoney(budget.budgetAmount)}
                    </span>
                    <Badge tone={STATUS[budget.status].tone}>{STATUS[budget.status].label}</Badge>
                    <IconButton label={`Edit ${budget.category} budget`} onClick={() => setEditing(budget)}>
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton label={`Delete ${budget.category} budget`} onClick={() => setRemoving(budget)}>
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {editing && (
        <BudgetModal
          budget={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && (
        <ConfirmModal
          title={`Delete the ${removing.category} budget?`}
          description="Your transactions stay as they are."
          action="Delete budget"
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await api(`/budgets/${removing.id}`, { method: "DELETE" });
            await refresh();
            toast.success("Budget deleted");
          }}
        />
      )}
    </>
  );
};

const CADENCE = { weekly: "Weekly", monthly: "Monthly", quarterly: "Every 3 months", yearly: "Yearly" };

const RecurringTab = ({ recurring }) => {
  const active = recurring.filter((item) => item.active);
  const subscriptions = active.filter((item) => item.subscription);
  const monthly = active.reduce((sum, item) => sum + item.monthlyCost, 0);

  if (!recurring.length) {
    return (
      <Card>
        <EmptyState title="Nothing recurring found yet" description="Payments that repeat at a regular interval show up here after two or three months of transactions." />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-5 pb-3">
          <SectionTitle
            title="Recurring payments"
            description={`${formatMoney(monthly)} a month in all, ${formatMoney(subscriptions.reduce((sum, item) => sum + item.monthlyCost, 0))} of it on ${subscriptions.length} ${subscriptions.length === 1 ? "subscription" : "subscriptions"}. Found from your transactions.`}
          />
        </div>
        <ul className="divide-y divide-line border-t border-line">
          {recurring.map((item) => (
            <li key={item.key} className={`flex items-start justify-between gap-4 px-5 py-3 ${item.active ? "" : "opacity-60"}`}>
              <div className="min-w-0">
                <p className="font-medium flex flex-wrap items-center gap-2">
                  {item.name}
                  {item.subscription && <Badge tone="accent">Subscription</Badge>}
                  {item.priceIncrease && <Badge tone="warn">Up from {formatMoney(item.priceIncrease.from)}</Badge>}
                  {!item.active && <Badge>Stopped</Badge>}
                </p>
                <p className="text-sm text-muted">
                  {CADENCE[item.cadence]}, {item.category}. {item.active ? `Next around ${formatDate(item.nextDate)}` : `Last on ${formatDate(item.lastDate)}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="tnum">{formatMoney(item.amount)}</p>
                {item.cadence !== "monthly" && <p className="text-sm text-muted tnum">{formatMoney(item.monthlyCost)} a month</p>}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
};

const KIND_LABELS = { bill: "Bill", emi: "EMI", sip: "SIP", insurance: "Insurance", subscription: "Subscription" };

const BillModal = ({ onClose }) => {
  const { refresh } = useData();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", amount: "", frequency: "monthly", due_day: "", due_month: "" });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return (
    <FormModal
      title="Add a bill reminder"
      submitLabel="Add reminder"
      onClose={onClose}
      onSubmit={async () => {
        await api("/wealth/bills", {
          method: "POST",
          body: {
            ...form,
            amount: Number(form.amount) || 0,
            due_day: Number(form.due_day),
            due_month: form.frequency === "monthly" ? undefined : Number(form.due_month),
          },
        });
        await refresh();
        toast.success("Reminder added");
      }}
    >
      <Field label="Name">
        <Input required placeholder="Electricity" value={form.name} onChange={set("name")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount">
          <Input type="number" min="0" value={form.amount} onChange={set("amount")} />
        </Field>
        <Field label="How often">
          <Select value={form.frequency} onChange={set("frequency")}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Every 3 months</option>
            <option value="yearly">Yearly</option>
          </Select>
        </Field>
        <Field label="Day of the month">
          <Input required type="number" min="1" max="31" value={form.due_day} onChange={set("due_day")} />
        </Field>
        {form.frequency !== "monthly" && (
          <Field label="First month (1 to 12)">
            <Input required type="number" min="1" max="12" value={form.due_month} onChange={set("due_month")} />
          </Field>
        )}
      </div>
    </FormModal>
  );
};

const UpcomingTab = ({ upcoming }) => {
  const [adding, setAdding] = useState(false);
  const total = upcoming.reduce((sum, item) => sum + (item.amount || 0), 0);
  const byDate = upcoming.reduce((groups, item) => {
    (groups[item.date] ||= []).push(item);
    return groups;
  }, {});

  return (
    <Card>
      <div className="p-5 pb-3">
        <SectionTitle title="Next five weeks" description={`${formatMoney(total)} due across bills, EMIs, SIPs, premiums and subscriptions.`}>
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus size={14} /> Bill reminder
          </Button>
        </SectionTitle>
      </div>
      {upcoming.length === 0 ? (
        <EmptyState title="Nothing due" description="Add bill reminders, debt due dates or SIP dates to see them here." />
      ) : (
        <ul>
          {Object.entries(byDate).map(([date, items]) => (
            <li key={date} className="border-t border-line px-5 py-3 grid grid-cols-[6.5rem_1fr] gap-4">
              <p className="text-sm text-muted tnum pt-0.5">{formatDate(date)}</p>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <span className="min-w-0">
                      {item.name} <span className="text-sm text-muted">{KIND_LABELS[item.kind]}</span>
                    </span>
                    <span className="tnum shrink-0">{item.amount ? formatMoney(item.amount) : ""}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {adding && <BillModal onClose={() => setAdding(false)} />}
    </Card>
  );
};

const RulesTab = () => {
  const toast = useToast();
  const { refresh } = useData();
  const [rules, setRules] = useState(null);
  const [form, setForm] = useState({ match: "", category: "Dining" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api("/transactions/rules");
    setRules(data);
  }, []);

  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, [load, toast]);

  const add = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { applied } = await api("/transactions/rules", { method: "POST", body: form });
      await Promise.all([load(), refresh()]);
      setForm({ ...form, match: "" });
      toast.success(`Rule saved and applied to ${applied} ${applied === 1 ? "transaction" : "transactions"}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const sortAgain = async () => {
    setBusy(true);
    try {
      const { data, remaining } = await api("/transactions/recategorize", { method: "POST" });
      await refresh();
      toast.success(`Sorted ${data.rule + data.keyword + data.ai}. ${remaining} still uncategorised.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <SectionTitle
        title="Categorisation rules"
        description="When a description contains the text, the transaction goes in that category. Rules come first, then known merchants, then AI."
      >
        <Button size="sm" variant="secondary" disabled={busy} onClick={sortAgain}>Sort uncategorised</Button>
      </SectionTitle>
      <form onSubmit={add} className="grid sm:grid-cols-[1fr_12rem_auto] gap-3 items-end mb-5">
        <Field label="Description contains">
          <Input required minLength={2} placeholder="swiggy" value={form.match} onChange={(event) => setForm({ ...form, match: event.target.value })} />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            {CATEGORIES.filter((category) => category !== "Uncategorised").map((category) => (
              <option key={category}>{category}</option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={busy}>Add rule</Button>
      </form>
      {rules === null ? (
        <Skeleton className="h-24" />
      ) : rules.length === 0 ? (
        <p className="text-muted">No rules yet. Tick "Always put transactions like this" when you change a category to create one.</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {rules.map((rule) => (
            <li key={rule._id} className="flex items-center justify-between gap-4 py-2">
              <span>
                "{rule.match}" <span className="text-muted">goes to</span> {rule.category}
              </span>
              <IconButton
                label={`Delete rule for ${rule.match}`}
                onClick={async () => {
                  await api(`/transactions/rules/${rule._id}`, { method: "DELETE" });
                  await load();
                }}
              >
                <Trash2 size={15} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

const Activity = ({ cashflow, spending }) => (
  <>
    <StatStrip>
      <Stat label="Income this month" value={formatMoney(cashflow.thisMonth.income)} />
      <Stat label="Spent this month" value={formatMoney(cashflow.thisMonth.expense)} />
      <Stat label="Usual monthly spending" value={formatMoney(cashflow.averageMonthlyExpense)} />
      <Stat label="Savings rate" value={`${cashflow.savingsRate}%`} />
    </StatStrip>

    <div className="grid @3xl:grid-cols-5 gap-4 mb-10">
      <Card className="@3xl:col-span-3 p-5">
        <SectionTitle title="Income and spending" description="Last 12 months" />
        <CashFlowChart months={cashflow.months} />
      </Card>
      <Card className="@3xl:col-span-2 p-5">
        <SectionTitle title="Where it went" description="Last 90 days" />
        {spending.length ? (
          <SpendingBars rows={spending} />
        ) : (
          <p className="text-muted">No spending in the last 90 days.</p>
        )}
      </Card>
    </div>

    <h2 className="text-lg font-semibold mb-4">Transactions</h2>
    <TransactionsTab />
  </>
);

export default function CashFlowPage({ view = "activity" }) {
  return (
    <Loaded>
      {({ cashflow, spending, budgets, recurring, upcoming }) => (
        <>
          {view === "activity" && <Activity cashflow={cashflow} spending={spending} />}
          {view === "budgets" && <BudgetsTab budgets={budgets} />}
          {view === "bills" && (
            <div className="space-y-6">
              <UpcomingTab upcoming={upcoming} />
              <RecurringTab recurring={recurring} />
            </div>
          )}
          {view === "rules" && <RulesTab />}
        </>
      )}
    </Loaded>
  );
}
