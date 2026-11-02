import React, { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import { formatDayMonth, formatMoney, toDateInput } from "../lib/format";
import Loaded from "../components/Loaded";
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  Field,
  FormModal,
  IconButton,
  Input,
  PageHeader,
  Progress,
  useToast,
} from "../components/ui";
import useNewParam from "../lib/useNewParam";

const STATUS = {
  "on-track": { tone: "gain", label: "On track" },
  "covered-by-savings": { tone: "accent", label: "Needs a top-up" },
  behind: { tone: "warn", label: "Behind" },
};

const GoalModal =({ goal, onClose }) => {
  const { refresh } = useData();
  const toast = useToast();
  const [form, setForm] = useState({
    name: goal?.name || "",
    target_amount: goal?.target_amount || "",
    saved_amount: goal?.saved_amount ?? "",
    target_date: toDateInput(goal?.target_date),
  });
  const set = (key) => (event) =>
    setForm({ ...form, [key]: event.target.value });

  return (
    <FormModal
      title={goal ? "Edit goal" : "Add goal"}
      submitLabel={goal ? "Save changes" : "Add goal"}
      onClose={onClose}
      onSubmit={async () => {
        await api(goal ? `/wealth/goals/${goal.id}` : "/wealth/goals", {
          method: goal ? "PUT" : "POST",
          body: {
            ...form,
            target_amount: Number(form.target_amount),
            saved_amount: Number(form.saved_amount) || 0,
          },
        });
        await refresh();
        toast.success(goal ? "Goal updated" : "Goal added");
      }}
    >
      <Field label="Name">
        <Input required placeholder="House deposit" value={form.name} onChange={set("name")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target amount">
          <Input required type="number" min="1" value={form.target_amount} onChange={set("target_amount")} />
        </Field>
        <Field label="Saved so far">
          <Input type="number" min="0" value={form.saved_amount} onChange={set("saved_amount")} />
        </Field>
      </div>
      <Field label="Target date">
        <Input required type="date" value={form.target_date} onChange={set("target_date")} />
      </Field>
    </FormModal>
  );
};

const monthsUntil = (date) => {
  const end = new Date(date);
  const now = new Date();
  return Math.max((end.getFullYear() - now.getFullYear()) * 12 + end.getMonth() - now.getMonth(), 0);
};

const annuity = (rate, months) => (rate === 0 ? months : ((1 + rate) ** months - 1) / rate);

// Works out what the goal reaches with more money each month. The monthly
// amount the server already assumes is recovered from its projection, so the
// slider at zero matches the figure above it.
const whatIf = (goal, extra) => {
  const months = monthsUntil(goal.target_date);
  const rate = (goal.rate || 0) / 1200;
  const grown = goal.current * (1 + rate) ** months;
  const base = months > 0 ? Math.max((goal.projected - grown) / annuity(rate, months), 0) : 0;
  const monthly = base + extra;
  const projected = grown + monthly * annuity(rate, months);

  let value = goal.current;
  let reachedIn = null;
  for (let month = 1; month <= 600; month += 1) {
    value = value * (1 + rate) + monthly;
    if (value >= goal.target_amount) {
      reachedIn = month;
      break;
    }
  }
  if (goal.current >= goal.target_amount) reachedIn = 0;
  return { projected, reachedIn, months };
};

const monthLabel = (offset) => {
  const date = new Date();
  date.setMonth(date.getMonth() + offset);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

const WhatIf = ({ goal }) => {
  const max = Math.max(Math.ceil((goal.extraMonthly || 0) * 2 / 1000) * 1000, 20000);
  const [extra, setExtra] = useState(Math.min(Math.round((goal.extraMonthly || 5000) / 500) * 500, max));
  const result = whatIf(goal, extra);
  const early = result.reachedIn !== null ? result.months - result.reachedIn : null;

  return (
    <div className="mt-4 pt-4 border-t border-line">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <label htmlFor={`what-if-${goal.id}`} className="text-sm font-medium">Put in more each month</label>
        <span className="tnum font-semibold">+{formatMoney(extra)}</span>
      </div>
      <input
        id={`what-if-${goal.id}`}
        type="range"
        min="0"
        max={max}
        step="500"
        value={extra}
        onChange={(event) => setExtra(Number(event.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
      <p className="text-sm mt-2">
        You'd have <span className="tnum font-medium">{formatMoney(result.projected)}</span> by {formatDayMonth(goal.target_date)}
        {result.reachedIn === null
          ? ", still short of the target."
          : early > 0
            ? <>, reaching the target in <span className="font-medium">{monthLabel(result.reachedIn)}</span>, {early} {early === 1 ? "month" : "months"} early.</>
            : early === 0
              ? ", reaching the target right on time."
              : <>, reaching the target in {monthLabel(result.reachedIn)}.</>}
      </p>
    </div>
  );
};

const GoalCard = ({ goal, onEdit, onRemove }) => {
  const [exploring, setExploring] = useState(false);
  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{goal.name}</p>
          <p className="text-sm text-muted">By {formatDayMonth(goal.target_date)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge tone={STATUS[goal.status].tone}>{STATUS[goal.status].label}</Badge>
          <IconButton label={`Edit ${goal.name}`} onClick={() => onEdit(goal)}>
            <Pencil size={15} />
          </IconButton>
          <IconButton label={`Delete ${goal.name}`} onClick={() => onRemove(goal)}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>
      <p className="text-[28px] font-semibold tnum tracking-tight mt-4 leading-none">
        {formatMoney(goal.current)}
        <span className="text-base font-normal text-muted tracking-normal"> of {formatMoney(goal.target_amount)}</span>
      </p>
      <div className="mt-4 mb-3">
        <Progress value={goal.progress} tone={goal.status === "behind" ? "loss" : goal.status === "on-track" ? "gain" : "accent"} label={`${goal.name} progress`} />
      </div>
      <p className="text-sm tnum">
        {goal.status === "on-track"
          ? `On course for ${formatMoney(goal.projected)}, growing at about ${goal.rate}% a year.`
          : `On course for ${formatMoney(goal.projected)}. Another ${formatMoney(goal.extraMonthly)} a month closes the gap${goal.status === "covered-by-savings" ? ", which your saving covers" : ""}.`}
      </p>
      {goal.linked.length > 0 ? (
        <p className="text-sm text-muted mt-2">
          {formatMoney(goal.linkedValue)} in {goal.linked.map((item) => item.name).join(", ")}
          {goal.linkedMonthly > 0 && `, plus ${formatMoney(goal.linkedMonthly)} a month in SIPs`}.
        </p>
      ) : (
        <p className="text-sm text-muted mt-2">
          Link investments to this goal on the <Link to="/wealth/investments" className="underline">Investments</Link> page to count them here.
        </p>
      )}
      {exploring ? (
        <WhatIf goal={goal} />
      ) : (
        <button onClick={() => setExploring(true)} className="mt-auto pt-4 self-start inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
          <SlidersHorizontal size={14} /> What if I put in more?
        </button>
      )}
    </Card>
  );
};

export default function GoalsPage() {
  const { refresh } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  useNewParam("goal", useCallback(() => setEditing("new"), []));

  return (
    <Loaded>
      {({ goals, cashflow }) => (
        <>
          <PageHeader
            title="Goals"
            description={
              cashflow.forecast.basedOnMonths > 0
                ? `You've been saving about ${formatMoney(cashflow.forecast.monthlySavings)} a month.`
                : "What you're saving towards."
            }
          >
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} /> Add goal
            </Button>
          </PageHeader>

          {goals.length === 0 ? (
            <Card>
              <EmptyState
                title="No goals yet"
                description="Add a goal to see what you need to save each month to reach it."
              >
                <Button onClick={() => setEditing("new")}>Add goal</Button>
              </EmptyState>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onEdit={setEditing} onRemove={setRemoving} />
              ))}
            </div>
          )}

          {editing && (
            <GoalModal
              goal={editing === "new" ? null : editing}
              onClose={() => setEditing(null)}
            />
          )}
          {removing && (
            <ConfirmModal
              title={`Delete ${removing.name}?`}
              description="This can't be undone."
              action="Delete goal"
              onClose={() => setRemoving(null)}
              onConfirm={async () => {
                await api(`/wealth/goals/${removing.id}`, { method: "DELETE" });
                await refresh();
                toast.success("Goal deleted");
              }}
            />
          )}
        </>
      )}
    </Loaded>
  );
}
