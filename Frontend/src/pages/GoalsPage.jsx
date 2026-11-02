import React, { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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

const GoalModal = ({ goal, onClose }) => {
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

export default function GoalsPage() {
  const { refresh } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);

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
                <Card key={goal.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{goal.name}</p>
                      <p className="text-sm text-muted">By {formatDayMonth(goal.target_date)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge tone={goal.onTrack ? "gain" : "warn"}>
                        {goal.onTrack ? "On track" : "Behind"}
                      </Badge>
                      <IconButton label={`Edit ${goal.name}`} onClick={() => setEditing(goal)}>
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton label={`Delete ${goal.name}`} onClick={() => setRemoving(goal)}>
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </div>
                  <p className="text-2xl font-semibold tnum tracking-tight mt-4">
                    {formatMoney(goal.saved_amount)}
                    <span className="text-base font-normal text-muted"> of {formatMoney(goal.target_amount)}</span>
                  </p>
                  <div className="mt-3 mb-3">
                    <Progress value={goal.progress} label={`${goal.name} progress`} />
                  </div>
                  <p className="text-sm text-muted tnum">
                    {formatMoney(goal.monthlyNeeded)} a month gets you there
                  </p>
                </Card>
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
