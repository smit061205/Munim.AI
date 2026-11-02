const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const formatMoney = (value) => INR.format(Math.round(value || 0));

export const formatSigned = (value) =>
  `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatMoney(Math.abs(value))}`;

// Lakh and crore shorthand, for axes and tight spaces
export const formatCompact = (value) => {
  const sign = value < 0 ? "-" : "";
  const amount = Math.abs(value || 0);
  const trim = (number) => number.toFixed(number >= 100 ? 0 : 1).replace(/\.0$/, "");

  if (amount >= 1e7) return `${sign}₹${trim(amount / 1e7)} Cr`;
  if (amount >= 1e5) return `${sign}₹${trim(amount / 1e5)} L`;
  if (amount >= 1e3) return `${sign}₹${trim(amount / 1e3)}k`;
  return `${sign}₹${Math.round(amount)}`;
};

export const formatPercent = (value) =>
  `${value > 0 ? "+" : ""}${Number(value).toFixed(1).replace(/\.0$/, "")}%`;

const pad = (value) => String(value).padStart(2, "0");

export const formatDate = (value, pattern = "DD/MM/YYYY") => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = {
    DD: pad(date.getUTCDate()),
    MM: pad(date.getUTCMonth() + 1),
    YYYY: date.getUTCFullYear(),
  };
  return pattern.replace(/DD|MM|YYYY/g, (key) => parts[key]);
};

const monthDate = (month) => new Date(`${month}-01T00:00:00Z`);

export const formatMonthShort = (month) =>
  monthDate(month).toLocaleDateString("en-IN", {
    month: "short",
    timeZone: "UTC",
  });

export const formatMonthLong = (month) =>
  monthDate(month).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export const formatDayMonth = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export const toDateInput = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

export const today = () => new Date().toISOString().slice(0, 10);

const LABELS = {
  home_loan: "Home loan",
  car_loan: "Car loan",
  personal_loan: "Personal loan",
  business_loan: "Business loan",
  education_loan: "Education loan",
  credit_card: "Credit card",
};

export const humanize = (value = "") =>
  LABELS[value] ||
  value.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());

export const downloadFile = (name, content, type = "text/csv") => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

export const toCsv = (rows) =>
  rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
