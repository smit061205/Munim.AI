import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, X } from "lucide-react";
import { formatMoney, formatPercent } from "../lib/format";

const BUTTON_VARIANTS = {
  primary: "bg-accent text-surface hover:bg-accent-hover shadow-sm",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-wash hover:border-faint/50",
  ghost: "text-muted hover:text-ink hover:bg-wash",
  danger: "bg-loss text-white hover:opacity-90",
};

export const Button = ({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-[background-color,border-color,transform] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${
      size === "sm" ? "h-8 px-3 text-sm" : "h-9 px-3.5 text-sm"
    } ${BUTTON_VARIANTS[variant]} ${className}`}
    {...props}
  />
);

export const IconButton = ({ label, className = "", ...props }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-ink hover:bg-wash transition-colors ${className}`}
    {...props}
  />
);

export const Card = ({ className = "", ...props }) => (
  <section
    className={`bg-surface border border-line rounded-2xl shadow-[var(--shadow-raise)] ${className}`}
    {...props}
  />
);

// Inside a section (Money, Wealth, Plan) the section owns the big title, so a
// page header becomes a line of context with the page's actions beside it
export const SectionContext = createContext(false);

export const PageHeader = ({ title, description, children }) => {
  const inSection = useContext(SectionContext);
  if (inSection) {
    if (!description && !children) return null;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        {description ? <p className="text-muted max-w-2xl">{description}</p> : <span />}
        {children && <div className="flex flex-wrap gap-2 no-print">{children}</div>}
      </div>
    );
  }
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="font-display text-[32px] leading-tight">{title}</h1>
        {description && <p className="text-muted mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2 no-print">{children}</div>}
    </div>
  );
};

export const SectionTitle = ({ title, description, children }) => (
  <div className="flex items-start justify-between gap-4 mb-4">
    <div>
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
    </div>
    {children}
  </div>
);

export const Money = ({ value, className = "" }) => (
  <span className={`tnum ${className}`}>{formatMoney(value)}</span>
);

// A gain or loss, always carrying a sign as well as colour
export const Delta = ({ value, percent, className = "" }) => {
  if (value === null || value === undefined) return null;
  const tone = value > 0 ? "text-gain" : value < 0 ? "text-loss" : "text-muted";
  return (
    <span className={`tnum font-medium ${tone} ${className}`}>
      {value > 0 ? "+" : value < 0 ? "-" : ""}
      {formatMoney(Math.abs(value))}
      {percent !== undefined && percent !== null && (
        <> ({formatPercent(percent)})</>
      )}
    </span>
  );
};

export const Stat = ({ label, value, children }) => (
  <div className="min-w-0">
    <p className="text-sm text-muted">{label}</p>
    <p className="text-[22px] font-semibold tracking-tight tnum mt-1 truncate">{value}</p>
    {children && <div className="text-sm mt-0.5">{children}</div>}
  </div>
);

// A row of related figures in one panel, divided rather than boxed separately
export const StatStrip = ({ children, className = "" }) => (
  <div className={`grid grid-cols-2 @3xl:grid-flow-col @3xl:auto-cols-fr bg-surface border border-line rounded-2xl shadow-[var(--shadow-raise)] mb-6 overflow-hidden ${className}`}>
    {React.Children.toArray(children).filter(Boolean).map((child, index) => (
      <div key={index} className="px-5 py-4 border-line [&:nth-child(n+3)]:border-t @3xl:[&:nth-child(n+3)]:border-t-0 [&:nth-child(even)]:border-l @3xl:[&:not(:first-child)]:border-l">
        {child}
      </div>
    ))}
  </div>
);

const BADGE_TONES = {
  neutral: "bg-wash text-muted",
  gain: "bg-gain-soft text-gain",
  loss: "bg-loss-soft text-loss",
  warn: "bg-warn-soft text-warn",
  accent: "bg-accent-soft text-accent",
};

export const Badge = ({ tone = "neutral", children }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${BADGE_TONES[tone]}`}
  >
    {children}
  </span>
);

export const Field = ({ label, hint, children }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5">
        {label}
      </label>
      {React.cloneElement(children, { id })}
      {hint && <p className="text-sm text-muted mt-1">{hint}</p>}
    </div>
  );
};

const CONTROL =
  "w-full h-10 px-3 bg-surface border border-line-strong rounded-lg text-ink placeholder:text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors disabled:bg-wash";

export const Input = ({ className = "", ...props }) => (
  <input className={`${CONTROL} ${className}`} {...props} />
);

export const Select = ({ className = "", ...props }) => (
  <select className={`${CONTROL} ${className}`} {...props} />
);

export const Toggle = ({ checked, onChange, label, description }) => {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-line-strong"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    </div>
  );
};

export const Tabs = ({ tabs, value, onChange }) => (
  <div role="tablist" className="inline-flex max-w-full gap-1 p-1 mb-6 rounded-xl bg-wash overflow-x-auto scrollbar-none">
    {tabs.map((tab) => (
      <button
        key={tab.value}
        role="tab"
        aria-selected={value === tab.value}
        onClick={() => onChange(tab.value)}
        className={`h-8 px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
          value === tab.value
            ? "bg-surface text-ink shadow-sm"
            : "text-muted hover:text-ink"
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export const EmptyState = ({ title, description, children }) => (
  <div className="py-12 px-6 text-center">
    <p className="font-medium">{title}</p>
    {description && (
      <p className="text-muted mt-1 max-w-sm mx-auto">{description}</p>
    )}
    {children && (
      <div className="flex flex-wrap justify-center gap-2 mt-4">{children}</div>
    )}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div role="alert" className="py-12 text-center">
    <p className="text-loss">{message}</p>
    {onRetry && (
      <Button variant="secondary" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

export const Skeleton = ({ className = "" }) => (
  <div className={`bg-wash rounded-lg animate-pulse ${className}`} />
);

export const Progress = ({ value, tone = "accent", label }) => (
  <div
    role="progressbar"
    aria-label={label}
    aria-valuenow={Math.round(value)}
    aria-valuemin={0}
    aria-valuemax={100}
    className="h-1.5 bg-wash rounded-full overflow-hidden"
  >
    <div
      className={`h-full rounded-full ${
        tone === "loss" ? "bg-loss" : tone === "gain" ? "bg-gain" : "bg-accent"
      }`}
      style={{ width: `${Math.min(value, 100)}%` }}
    />
  </div>
);

export const Modal = ({ title, description, onClose, children }) => {
  const panel = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector("input, select, textarea, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-surface rounded-t-2xl sm:rounded-2xl border border-line shadow-[var(--shadow-float)] p-6"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && (
              <p className="text-sm text-muted mt-0.5">{description}</p>
            )}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
};

export const ConfirmModal = ({
  title,
  description,
  action,
  onConfirm,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={title} description={description} onClose={onClose}>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" disabled={busy} onClick={confirm}>
          {action}
        </Button>
      </div>
    </Modal>
  );
};

// A form inside a modal, handling the busy and error states
export const FormModal = ({
  title,
  description,
  submitLabel,
  onSubmit,
  onClose,
  children,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={title} description={description} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {children}
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
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((tone, message) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, message }]);
    setTimeout(
      () => setToasts((current) => current.filter((item) => item.id !== id)),
      tone === "error" ? 6000 : 3500,
    );
  }, []);

  const value = useMemo(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed z-[60] bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-[calc(100%-32px)] max-w-sm no-print"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-start gap-2 px-4 py-3 rounded-xl bg-ink text-canvas text-sm shadow-[var(--shadow-float)]"
          >
            {toast.tone === "error" ? (
              <AlertCircle size={18} className="shrink-0" />
            ) : (
              <Check size={18} className="shrink-0" />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
