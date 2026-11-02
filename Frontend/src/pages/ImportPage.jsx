import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CircleCheck, FileText, Landmark, Lock, PieChart, Upload } from "lucide-react";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";
import { Button, Card, Field, Input, PageHeader } from "../components/ui";

const KINDS = {
  holdings: {
    icon: PieChart,
    label: "Investments",
    detail: "A CAS from CAMS or KFintech, or an NSDL or CDSL statement",
    accept: ".pdf",
  },
  bank: {
    icon: Landmark,
    label: "Bank or card spending",
    detail: "A bank or credit card statement as PDF, Excel or CSV",
    accept: ".pdf,.xlsx,.xls,.csv",
  },
};

const SOURCE_LABELS = {
  cams: "CAMS or KFintech statement",
  depository: "NSDL or CDSL statement",
  ai: "statement read by AI",
};

// A first guess from the file itself. The user can always switch it.
const guessKind = (file) => {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".pdf")) return "bank";
  if (/cas|cams|kfin|karvy|nsdl|cdsl|demat|consolidated|mutual|folio/.test(name)) return "holdings";
  return "bank";
};

const HOW_TO = [
  {
    title: "Mutual fund statement (CAS)",
    body: "Request a detailed CAS from the CAMS or KFintech website. It arrives by email as a PDF, usually locked with your PAN.",
  },
  {
    title: "Shares",
    body: "NSDL and CDSL email a monthly CAS covering every demat account. Upload it the same way.",
  },
  {
    title: "Bank statements",
    body: "Download the last few months from net banking as PDF, Excel or CSV. Credit card statements work too.",
  },
];

const DropZone = ({ onFile }) => {
  const input = useRef(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
        over ? "border-accent bg-accent-soft/50" : "border-line-strong bg-surface"
      }`}
    >
      <span className="w-12 h-12 mx-auto rounded-2xl bg-accent-soft text-accent inline-flex items-center justify-center">
        <Upload size={22} />
      </span>
      <p className="text-lg font-medium mt-4">Drop a statement here</p>
      <p className="text-muted mt-1">PDF, Excel or CSV. Munim works out what it is.</p>
      <input
        ref={input}
        type="file"
        hidden
        accept=".pdf,.xlsx,.xls,.csv"
        onChange={(event) => {
          const file = event.target.files[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <Button className="mt-5" onClick={() => input.current.click()}>
        Choose a file
      </Button>
    </div>
  );
};

const HoldingsPreview = ({ result, busy, onImport, onBack }) => {
  const rows = [
    ...result.funds.map((fund) => ({ key: `f-${fund.isin || fund.scheme_name}`, name: fund.scheme_name, detail: fund.category, value: fund.current_value })),
    ...result.stocks.map((stock) => ({ key: `s-${stock.isin || stock.company_name}`, name: stock.company_name, detail: stock.symbol || "Stock", value: stock.current_value })),
  ];
  const total = rows.reduce((sum, row) => sum + (row.value || 0), 0);

  return (
    <Card>
      <div className="p-5">
        <h2 className="text-lg font-semibold">Check these holdings</h2>
        <p className="text-muted mt-1">
          {rows.length} holdings worth {formatMoney(total)}, from a {SOURCE_LABELS[result.source] || "statement"}. Ones you already hold are updated, not added twice.
        </p>
      </div>
      <ul className="divide-y divide-line border-y border-line max-h-[420px] overflow-y-auto">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{row.name}</p>
              <p className="text-sm text-muted">{row.detail}</p>
            </div>
            <span className="tnum shrink-0">{formatMoney(row.value)}</span>
          </li>
        ))}
      </ul>
      <div className="p-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {result.source === "ai" ? "This layout was read by AI, so check the figures first." : "Nothing is saved until you import."}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onBack}>Back</Button>
          <Button disabled={busy || !rows.length} onClick={() => onImport(result)}>
            {busy ? "Importing..." : `Import ${rows.length} holdings`}
          </Button>
        </div>
      </div>
    </Card>
  );
};

const Done = ({ summary, onAgain }) => (
  <Card className="p-8 text-center">
    <span className="w-12 h-12 mx-auto rounded-full bg-gain-soft text-gain inline-flex items-center justify-center">
      <CircleCheck size={24} />
    </span>
    <h2 className="text-xl font-semibold mt-4">{summary.title}</h2>
    <p className="text-muted mt-1 max-w-md mx-auto">{summary.body}</p>
    <div className="flex flex-wrap justify-center gap-2 mt-6">
      <Link to={summary.to} className="inline-flex items-center h-9 px-3.5 rounded-lg bg-accent text-surface text-sm font-medium hover:bg-accent-hover">
        {summary.cta}
      </Link>
      <Button variant="secondary" onClick={onAgain}>Import another</Button>
    </div>
  </Card>
);

export default function ImportPage() {
  const { refresh } = useData();
  const [file, setFile] = useState(null);
  const [kind, setKind] = useState("bank");
  const [password, setPassword] = useState("");
  const [preview, setPreview] = useState(null);
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setSummary(null);
    setPassword("");
    setError(null);
    setBusy(false);
  };

  const choose = (picked) => {
    reset();
    setFile(picked);
    setKind(guessKind(picked));
  };

  const read = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (kind === "holdings") {
        const form = new FormData();
        form.append("statement", file);
        form.append("password", password);
        const { data } = await api("/investments/statement/preview", { method: "POST", form });
        setPreview(data);
        setPassword("");
      } else {
        const form = new FormData();
        form.append("files", file);
        const result = await api("/ingest/excel?target=transactions", { method: "POST", form });
        await refresh();
        const sorted = result.categorized ? result.categorized.rule + result.categorized.keyword + result.categorized.ai : 0;
        setSummary({
          title: `${result.inserted} transactions imported`,
          body: `${sorted} were sorted into categories automatically${result.skipped ? `, and ${result.skipped} duplicates or blank rows were skipped` : ""}.${result.readBy === "ai" ? " The layout was read by AI, so give them a quick look." : ""}`,
          to: "/money",
          cta: "See transactions",
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const importHoldings = async (result) => {
    setBusy(true);
    setError(null);
    try {
      const { added, updated } = await api("/investments/statement/import", {
        method: "POST",
        body: { funds: result.funds, stocks: result.stocks },
      });
      await refresh();
      setSummary({
        title: "Investments updated",
        body: `${added} holdings added and ${updated} updated. Prices refresh daily from AMFI and NSE.`,
        to: "/wealth/investments",
        cta: "See investments",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Import" description="One place for every statement. Files are read once and never stored." />

      <div className="grid @3xl:grid-cols-[1fr_300px] gap-8 items-start">
        <div className="space-y-4">
          {summary ? (
            <Done summary={summary} onAgain={reset} />
          ) : preview ? (
            <HoldingsPreview result={preview} busy={busy} onImport={importHoldings} onBack={() => setPreview(null)} />
          ) : !file ? (
            <DropZone onFile={choose} />
          ) : (
            <Card className="p-5">
              <form onSubmit={read} className="space-y-5">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-wash">
                  <FileText size={20} className="text-muted shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={reset}>Change</Button>
                </div>

                <fieldset>
                  <legend className="text-sm font-medium mb-2">What's in it?</legend>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {Object.entries(KINDS).map(([value, option]) => {
                      const Icon = option.icon;
                      const disabled = value === "holdings" && !file.name.toLowerCase().endsWith(".pdf");
                      return (
                        <label
                          key={value}
                          className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            kind === value ? "border-accent bg-accent-soft/40" : "border-line hover:border-line-strong"
                          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <input
                            type="radio"
                            name="kind"
                            value={value}
                            checked={kind === value}
                            disabled={disabled}
                            onChange={() => setKind(value)}
                            className="sr-only"
                          />
                          <Icon size={18} className={kind === value ? "text-accent mt-0.5" : "text-muted mt-0.5"} />
                          <span>
                            <span className="block font-medium">{option.label}</span>
                            <span className="block text-sm text-muted">{option.detail}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {kind === "holdings" && (
                  <Field label="Statement password" hint="Usually your PAN in capitals. Leave it blank if the PDF isn't locked.">
                    <Input type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} />
                  </Field>
                )}

                {error && <p role="alert" className="text-sm text-loss">{error}</p>}

                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={reset}>Cancel</Button>
                  <Button type="submit" disabled={busy}>
                    {busy ? "Reading..." : kind === "holdings" ? "Read statement" : "Import transactions"}
                  </Button>
                </div>
              </form>
            </Card>
          )}
          {preview && error && <p role="alert" className="text-sm text-loss">{error}</p>}
        </div>

        <aside className="space-y-5">
          <div className="flex gap-3 text-sm">
            <Lock size={16} className="text-gain shrink-0 mt-0.5" />
            <p className="text-muted">Statements are read in memory and thrown away. Only the holdings and transactions you confirm are saved.</p>
          </div>
          <div>
            <h2 className="font-semibold mb-3">Where to get them</h2>
            <ul className="space-y-4">
              {HOW_TO.map((item) => (
                <li key={item.title}>
                  <p className="font-medium text-[15px]">{item.title}</p>
                  <p className="text-sm text-muted mt-0.5">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
