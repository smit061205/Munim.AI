import React, { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import { formatDayMonth, formatMoney, humanize } from "../lib/format";
import Loaded from "../components/Loaded";
import {
  Badge,
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
  StatStrip,
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
      { key: "due_day", label: "EMI date (day of the month)", number: true, optional: true },
    ],
  },
  insurance: {
    noun: "policy",
    path: "/wealth/insurance",
    fields: [
      { key: "kind", label: "Type", options: ["term", "health", "life", "other"] },
      { key: "name", label: "Name", required: true },
      { key: "insurer", label: "Insurer" },
      { key: "cover", label: "Cover amount", number: true, required: true },
      { key: "premium", label: "Premium", number: true },
      { key: "frequency", label: "Premium paid", options: ["yearly", "monthly", "quarterly"] },
      { key: "renewal_date", label: "Next renewal", date: true },
      { key: "for_parents", label: "Covers your parents", boolean: true },
    ],
  },
};

const LABELS = { term: "Term life", health: "Health", life: "Life", other: "Other", yearly: "Yearly", monthly: "Monthly", quarterly: "Quarterly" };
const recordId = (record) => record.id || record._id;

const RecordModal = ({ kind, record, onClose }) => {
  const { refresh } = useData();
  const toast = useToast();
  const { noun, path, fields } = KINDS[kind];
  const [form, setForm] = useState(
    Object.fromEntries(
      fields.map((field) => [
        field.key,
        field.date ? (record?.[field.key] || "").slice(0, 10) : record?.[field.key] ?? field.options?.[0] ?? (field.boolean ? false : ""),
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
            field.number
              ? field.optional && form[field.key] === "" ? null : Number(form[field.key]) || 0
              : form[field.key],
          ]),
        );
        await api(record ? `${path}/${recordId(record)}` : path, {
          method: record ? "PUT" : "POST",
          body,
        });
        await refresh();
        toast.success(`${label} ${record ? "updated" : "added"}`);
      }}
    >
      {fields.map((field) => (
        <Field key={field.key} label={field.label}>
          {field.boolean ? (
            <Select
              value={form[field.key] ? "yes" : "no"}
              onChange={(event) => setForm({ ...form, [field.key]: event.target.value === "yes" })}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </Select>
          ) : field.options ? (
            <Select
              value={form[field.key]}
              onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
            >
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {LABELS[option] || humanize(option)}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              required={field.required}
              type={field.number ? "number" : field.date ? "date" : "text"}
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
            <li key={recordId(row)} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{name}</p>
                <p className="text-sm text-muted break-words">{detail}</p>
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

const ordinal = (day) => `${day}${[11, 12, 13].includes(day % 100) ? "th" : { 1: "st", 2: "nd", 3: "rd" }[day % 10] || "th"}`;

// Rules of thumb: life cover of ten years' income plus debts, and family
// health cover of at least ₹10 lakh
const CoverCheck = ({ insurance, liabilities, cashflow }) => {
  const yearlyIncome = (cashflow.averageMonthlyIncome || 0) * 12;
  const lifeNeeded = yearlyIncome * 10 + liabilities.total;
  const lifeCover = insurance.filter((row) => ["term", "life"].includes(row.kind)).reduce((sum, row) => sum + row.cover, 0);
  const healthCover = insurance.filter((row) => row.kind === "health" && !row.for_parents).reduce((sum, row) => sum + row.cover, 0);
  const parentsCover = insurance.filter((row) => row.kind === "health" && row.for_parents).reduce((sum, row) => sum + row.cover, 0);
  const checks = [
    {
      label: "Life cover",
      ok: lifeCover >= lifeNeeded,
      text: yearlyIncome
        ? `${formatMoney(lifeCover)} against about ${formatMoney(lifeNeeded)}: ten years of income plus your debts.`
        : "Add income transactions to work out how much you need.",
    },
    {
      label: "Health cover",
      ok: healthCover >= 1000000,
      text: `${formatMoney(healthCover)} for you and your family. ₹10 lakh or more is a common minimum in cities.`,
    },
    {
      label: "Parents' health cover",
      ok: parentsCover >= 500000,
      text: parentsCover ? `${formatMoney(parentsCover)}. Premiums for parents also count under 80D.` : "None added. Separate cover for parents keeps your own policy's limit free.",
    },
  ];

  return (
    <Card className="p-5">
      <h2 className="font-semibold mb-3">Cover check</h2>
      <ul className="space-y-3">
        {checks.map((check) => (
          <li key={check.label}>
            <p className="font-medium flex items-center gap-2">
              {check.label} <Badge tone={check.ok ? "gain" : "warn"}>{check.ok ? "Enough" : "Short"}</Badge>
            </p>
            <p className="text-sm text-muted">{check.text}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted mt-3">Rules of thumb, not advice. Your needs depend on your family and health.</p>
    </Card>
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
      {({ assets, liabilities, credit, netWorth, insurance, cashflow }) => (
        <>
          <PageHeader
            title="Accounts"
            description="Everything you own and owe, outside your portfolio."
          />

          <StatStrip>
            <Stat label="Cash" value={formatMoney(assets.cash)} />
            <Stat label="Total assets" value={formatMoney(netWorth.grossAssets)} />
            <Stat label="Total debt" value={formatMoney(liabilities.total)} />
            <Stat label="Monthly EMIs" value={formatMoney(liabilities.monthlyPayment)} />
          </StatStrip>

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
                detail: `${row.interest_rate ?? 0}% interest, ${formatMoney(row.monthly_payment)} a month${row.due_day ? ` on the ${ordinal(row.due_day)}` : ""}`,
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
            <RecordList
              title="Insurance"
              kind="insurance"
              rows={insurance}
              onEdit={onEdit}
              onRemove={onRemove}
              describe={(row) => ({
                name: row.name,
                detail: `${LABELS[row.kind]}${row.for_parents ? " for parents" : ""}, ${formatMoney(row.premium)} ${(LABELS[row.frequency] || "yearly").toLowerCase()}${row.renewal_date ? `, renews ${formatDayMonth(row.renewal_date)}` : ""}`,
                value: row.cover,
              })}
            />
            <CoverCheck insurance={insurance} liabilities={liabilities} cashflow={cashflow} />
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
                await api(`${KINDS[removing.kind].path}/${recordId(removing.record)}`, {
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
