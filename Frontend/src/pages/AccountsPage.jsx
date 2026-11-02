import React, { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import { formatMoney, humanize } from "../lib/format";
import Loaded from "../components/Loaded";
import {
  Button,
  Card,
  ConfirmModal,
  Field,
  FormModal,
  IconButton,
  Input,
  PageHeader,
  Select,
  Stat,
  useToast,
} from "../components/ui";

// Each kind of record differs only in its fields and where it is saved
const KINDS = {
  account: {
    noun: "bank account",
    path: "/accounts",
    fields: [
      { key: "bank_name", label: "Bank", required: true },
      { key: "type", label: "Account type", options: ["savings", "current", "checking", "investment"] },
      { key: "account_number", label: "Last four digits" },
      { key: "balance", label: "Balance", number: true, required: true },
    ],
  },
  property: {
    noun: "property",
    path: "/wealth/assets/real_estate",
    fields: [
      { key: "address", label: "Name or address", required: true },
      { key: "type", label: "Type", options: ["residential", "commercial", "land"] },
      { key: "current_value", label: "Current value", number: true, required: true },
    ],
  },
  vehicle: {
    noun: "vehicle",
    path: "/wealth/assets/vehicles",
    fields: [
      { key: "type", label: "Type", options: ["car", "bike", "truck", "other"] },
      { key: "make", label: "Make", required: true },
      { key: "model", label: "Model" },
      { key: "year", label: "Year", number: true },
      { key: "current_value", label: "Current value", number: true, required: true },
    ],
  },
  debt: {
    noun: "debt",
    path: "/wealth/liabilities",
    fields: [
      {
        key: "type",
        label: "Type",
        options: ["home_loan", "car_loan", "personal_loan", "education_loan", "business_loan", "credit_card"],
      },
      { key: "remaining_balance", label: "Amount owed", number: true, required: true },
      { key: "monthly_payment", label: "Monthly payment", number: true },
      { key: "interest_rate", label: "Interest rate (%)", number: true },
    ],
  },
};

const RecordModal = ({ kind, record, onClose }) => {
  const { refresh } = useData();
  const toast = useToast();
  const { noun, path, fields } = KINDS[kind];
  const [form, setForm] = useState(
    Object.fromEntries(
      fields.map((field) => [
        field.key,
        record?.[field.key] ?? field.options?.[0] ?? "",
      ]),
    ),
  );

  const label = noun.replace(/^./, (letter) => letter.toUpperCase());

  return (
    <FormModal
      title={`${record ? "Edit" : "Add"} ${noun}`}
      submitLabel={record ? "Save changes" : `Add ${noun}`}
      onClose={onClose}
      onSubmit={async () => {
        const body = Object.fromEntries(
          fields.map((field) => [
            field.key,
            field.number ? Number(form[field.key]) || 0 : form[field.key],
          ]),
        );
        await api(record ? `${path}/${record.id}` : path, {
          method: record ? "PUT" : "POST",
          body,
        });
        await refresh();
        toast.success(`${label} ${record ? "updated" : "added"}`);
      }}
    >
      {fields.map((field) => (
        <Field key={field.key} label={field.label}>
          {field.options ? (
            <Select
              value={form[field.key]}
              onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
            >
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {humanize(option)}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              required={field.required}
              type={field.number ? "number" : "text"}
              min={field.number ? "0" : undefined}
              step={field.number ? "any" : undefined}
              value={form[field.key]}
              onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
            />
          )}
        </Field>
      ))}
    </FormModal>
  );
};

const RecordList = ({ title, kind, rows, describe, onEdit, onRemove }) => (
  <Card>
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <h2 className="font-semibold">{title}</h2>
      <Button size="sm" variant="secondary" onClick={() => onEdit(kind, null)}>
        <Plus size={14} /> Add
      </Button>
    </div>
    {rows.length === 0 ? (
      <p className="px-5 pb-5 text-muted">Nothing here yet.</p>
    ) : (
      <ul className="border-t border-line divide-y divide-line">
        {rows.map((row) => {
          const { name, detail, value } = describe(row);
          return (
            <li key={row.id || row._id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{name}</p>
                <p className="text-sm text-muted truncate">{detail}</p>
              </div>
              <p className="tnum shrink-0">{formatMoney(value)}</p>
              <div className="flex gap-0.5 shrink-0">
                <IconButton label={`Edit ${name}`} onClick={() => onEdit(kind, row)}>
                  <Pencil size={15} />
                </IconButton>
                <IconButton label={`Remove ${name}`} onClick={() => onRemove(kind, row, name)}>
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </Card>
);

const CreditModal = ({ credit, onClose }) => {
  const { refresh } = useData();
  const toast = useToast();
  const [score, setScore] = useState(credit?.credit_score || "");
  const [utilization, setUtilization] = useState(credit?.credit_utilization ?? "");

  return (
    <FormModal
      title="Credit score"
      description="Enter the score from your latest CIBIL or bureau report."
      submitLabel="Save score"
      onClose={onClose}
      onSubmit={async () => {
        await api("/wealth/credit-score", {
          method: "PUT",
          body: { credit_score: Number(score), credit_utilization: Number(utilization) },
        });
        await refresh();
        toast.success("Credit score saved");
      }}
    >
      <Field label="Score" hint="Between 300 and 900">
        <Input required type="number" min="300" max="900" value={score} onChange={(event) => setScore(event.target.value)} />
      </Field>
      <Field label="Credit used (%)">
        <Input type="number" min="0" max="100" value={utilization} onChange={(event) => setUtilization(event.target.value)} />
      </Field>
    </FormModal>
  );
};

const creditBand = (score) =>
  score >= 750 ? "Excellent" : score >= 700 ? "Good" : score >= 650 ? "Fair" : "Needs work";

export default function AccountsPage() {
  const { refresh } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [editingCredit, setEditingCredit] = useState(false);

  const onEdit = (kind, record) => setEditing({ kind, record });
  const onRemove = (kind, record, name) => setRemoving({ kind, record, name });

  return (
    <Loaded>
      {({ assets, liabilities, credit, netWorth }) => (
        <>
          <PageHeader
            title="Accounts"
            description="Everything you own and owe, outside your portfolio."
          />

          <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-6 mb-8">
            <Stat label="Cash" value={formatMoney(assets.cash)} />
            <Stat label="Total assets" value={formatMoney(netWorth.grossAssets)} />
            <Stat label="Total debt" value={formatMoney(liabilities.total)} />
            <Stat label="Monthly EMIs" value={formatMoney(liabilities.monthlyPayment)} />
          </div>

          <div className="grid @3xl:grid-cols-2 gap-6">
            <RecordList
              title="Bank accounts"
              kind="account"
              rows={assets.accounts}
              onEdit={onEdit}
              onRemove={onRemove}
              describe={(row) => ({
                name: row.bank_name,
                detail: humanize(row.type),
                value: row.balance,
              })}
            />
            <RecordList
              title="Debts"
              kind="debt"
              rows={liabilities.items}
              onEdit={onEdit}
              onRemove={onRemove}
              describe={(row) => ({
                name: humanize(row.type),
                detail: `${row.interest_rate ?? 0}% interest, ${formatMoney(row.monthly_payment)} a month`,
                value: row.remaining_balance,
              })}
            />
            <RecordList
              title="Property"
              kind="property"
              rows={assets.realEstate}
              onEdit={onEdit}
              onRemove={onRemove}
              describe={(row) => ({
                name: row.address || humanize(row.type),
                detail: humanize(row.type),
                value: row.current_value,
              })}
            />
            <RecordList
              title="Vehicles"
              kind="vehicle"
              rows={assets.vehicleItems}
              onEdit={onEdit}
              onRemove={onRemove}
              describe={(row) => ({
                name: [row.make, row.model].filter(Boolean).join(" ") || humanize(row.type),
                detail: [humanize(row.type), row.year].filter(Boolean).join(", "),
                value: row.current_value,
              })}
            />
            <Card className="p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <h2 className="font-semibold">Credit score</h2>
                <Button size="sm" variant="secondary" onClick={() => setEditingCredit(true)}>
                  {credit ? "Update" : "Add score"}
                </Button>
              </div>
              {credit ? (
                <>
                  <p className="text-3xl font-semibold tnum tracking-tight">
                    {credit.credit_score}{" "}
                    <span className="text-base font-normal text-muted">
                      {creditBand(credit.credit_score)}
                    </span>
                  </p>
                  <p className="text-sm text-muted mt-1 tnum">
                    {credit.credit_utilization ?? 0}% of your credit limit in use
                  </p>
                </>
              ) : (
                <p className="text-muted">
                  Add your score from your latest bureau report to track it here.
                </p>
              )}
            </Card>
          </div>

          {editing && (
            <RecordModal
              kind={editing.kind}
              record={editing.record}
              onClose={() => setEditing(null)}
            />
          )}
          {editingCredit && (
            <CreditModal credit={credit} onClose={() => setEditingCredit(false)} />
          )}
          {removing && (
            <ConfirmModal
              title={`Remove ${removing.name}?`}
              description={`This removes the ${KINDS[removing.kind].noun} from your net worth.`}
              action="Remove"
              onClose={() => setRemoving(null)}
              onConfirm={async () => {
                await api(`${KINDS[removing.kind].path}/${removing.record.id}`, {
                  method: "DELETE",
                });
                await refresh();
                toast.success(`${removing.name} removed`);
              }}
            />
          )}
        </>
      )}
    </Loaded>
  );
}
