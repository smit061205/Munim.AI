import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
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
  Tabs,
  useToast,
} from "../components/ui";

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
  "Other",
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
  const set = (key) => (event) =>
    setForm({ ...form, [key]: event.target.value });

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
        };
        if (transaction) {
          await api(`/transactions/${transaction.id}`, { method: "PUT", body });
        } else {
          await api("/transactions", { method: "POST", body });
        }
        await onSaved(transaction ? "Transaction updated" : "Transaction added");
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
      toast.success(
        `Imported ${result.inserted} transactions. Skipped ${result.skipped} duplicates.`,
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
        <div className="flex gap-2 @3xl:ml-auto">
          <input ref={fileInput} type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleImport} />
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

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} /> Add budget
        </Button>
      </div>
      {budgets.length === 0 ? (
        <Card>
          <EmptyState
            title="No budgets yet"
            description="Set a limit for a category and see how close you are as you spend."
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {budgets.map((budget) => (
            <Card key={budget.id} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-medium">{budget.category}</p>
                  <p className="text-sm text-muted tnum">
                    {formatMoney(budget.spentAmount)} of {formatMoney(budget.budgetAmount)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge tone={STATUS[budget.status].tone}>{STATUS[budget.status].label}</Badge>
                  <IconButton label={`Edit ${budget.category} budget`} onClick={() => setEditing(budget)}>
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton label={`Delete ${budget.category} budget`} onClick={() => setRemoving(budget)}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
              <Progress
                value={budget.percentUsed}
                tone={budget.status === "over-budget" ? "loss" : "accent"}
                label={`${budget.category} budget used`}
              />
            </Card>
          ))}
        </div>
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

export default function CashFlowPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "budgets" ? "budgets" : "transactions";

  return (
    <Loaded>
      {({ cashflow, spending, budgets }) => (
        <>
          <PageHeader title="Cash flow" description="What comes in, what goes out and what's left." />

          <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-6 mb-8">
            <Stat label="Income this month" value={formatMoney(cashflow.thisMonth.income)} />
            <Stat label="Spending this month" value={formatMoney(cashflow.thisMonth.expense)} />
            <Stat label="Average monthly spending" value={formatMoney(cashflow.averageMonthlyExpense)} />
            <Stat label="Savings rate" value={`${cashflow.savingsRate}%`} />
          </div>

          <div className="grid @3xl:grid-cols-5 gap-6 mb-8">
            <Card className="@3xl:col-span-3 p-5">
              <SectionTitle title="Income and spending" description="Last 12 months" />
              <CashFlowChart months={cashflow.months} />
            </Card>
            <Card className="@3xl:col-span-2 p-5">
              <SectionTitle title="Top categories" description="Last 90 days" />
              {spending.length ? (
                <SpendingBars rows={spending} />
              ) : (
                <p className="text-muted">No spending in the last 90 days.</p>
              )}
            </Card>
          </div>

          <Tabs
            value={tab}
            onChange={(value) =>
              setParams(value === "budgets" ? { tab: "budgets" } : {})
            }
            tabs={[
              { value: "transactions", label: "Transactions" },
              { value: "budgets", label: "Budgets" },
            ]}
          />
          {tab === "budgets" ? <BudgetsTab budgets={budgets} /> : <TransactionsTab />}
        </>
      )}
    </Loaded>
  );
}
