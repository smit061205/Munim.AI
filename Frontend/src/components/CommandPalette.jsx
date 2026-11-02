import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  CornerDownLeft,
  Eye,
  Goal,
  Landmark,
  LayoutDashboard,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Upload,
  Wrench,
} from "lucide-react";
import { useAssistant } from "../context/AssistantContext";
import { getPrivacy, setPrivacy } from "../lib/display";

const PAGES = [
  { label: "Today", to: "/today", icon: LayoutDashboard },
  { label: "Transactions", to: "/money", icon: ArrowLeftRight, keywords: "money spending income cash flow" },
  { label: "Budgets", to: "/money/budgets", icon: ArrowLeftRight },
  { label: "Bills and subscriptions", to: "/money/bills", icon: ArrowLeftRight, keywords: "upcoming recurring emi calendar" },
  { label: "Monthly statements", to: "/money/statements", icon: ArrowLeftRight, keywords: "reports pdf" },
  { label: "Category rules", to: "/money/rules", icon: ArrowLeftRight },
  { label: "Net worth", to: "/wealth", icon: Landmark, keywords: "wealth assets" },
  { label: "Investments", to: "/wealth/investments", icon: Landmark, keywords: "portfolio holdings mutual funds stocks sip xirr rebalance epf" },
  { label: "Accounts and loans", to: "/wealth/accounts", icon: Landmark, keywords: "bank debt insurance credit score property" },
  { label: "Goals", to: "/plan", icon: Goal },
  { label: "Tax", to: "/plan/tax", icon: Goal, keywords: "80c regime capital gains harvesting" },
  { label: "SIP calculator", to: "/plan/tools?tab=sip", icon: Wrench },
  { label: "Retirement calculator", to: "/plan/tools?tab=retirement", icon: Wrench },
  { label: "Prepay a loan or invest", to: "/plan/tools?tab=prepay", icon: Wrench },
  { label: "Debt payoff plan", to: "/plan/tools?tab=debts", icon: Wrench },
  { label: "Import a statement", to: "/import", icon: Upload, keywords: "cas cams kfintech nsdl cdsl bank pdf excel upload" },
  { label: "Conversation history", to: "/assistant", icon: MessageCircle },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Risk profile", to: "/settings?section=investor", icon: Settings },
  { label: "Data and privacy", to: "/settings?section=privacy", icon: Settings, keywords: "sample delete export" },
];

const ACTIONS = [
  { label: "Add a transaction", to: "/money?new=transaction", icon: Plus },
  { label: "Add a budget", to: "/money/budgets?new=budget", icon: Plus },
  { label: "Add an investment", to: "/wealth/investments?new=investment", icon: Plus },
  { label: "Add a goal", to: "/plan?new=goal", icon: Plus },
];

const looksLikeQuestion = (text) =>
  /\?$/.test(text) || /^(how|what|why|when|where|which|should|can|is|am|do|does|will|could|explain|compare|show|help)\b/i.test(text) || text.split(/\s+/).length >= 4;

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { ask } = useAssistant();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const list = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo(() => {
    const term = query.trim();
    const lower = term.toLowerCase();
    const toggles = [
      {
        label: getPrivacy() ? "Show amounts" : "Hide amounts",
        icon: Eye,
        run: () => setPrivacy(!getPrivacy()),
      },
    ];

    const match = (item) => !lower || `${item.label} ${item.keywords || ""}`.toLowerCase().includes(lower);
    const askItem = term && {
      label: `Ask Munim: "${term}"`,
      icon: MessageCircle,
      accent: true,
      run: () => ask(term),
    };
    const searchItem = term && {
      label: `Search transactions for "${term}"`,
      icon: Search,
      to: `/money?q=${encodeURIComponent(term)}`,
    };

    const groups = [];
    if (askItem && looksLikeQuestion(term)) groups.push({ title: "Assistant", items: [askItem] });
    const actions = ACTIONS.filter(match);
    const pages = PAGES.filter(match).slice(0, lower ? 6 : 8);
    if (actions.length) groups.push({ title: "Add", items: actions });
    if (pages.length) groups.push({ title: "Go to", items: pages });
    const display = toggles.filter(match);
    if (display.length) groups.push({ title: "Display", items: display });
    if (term) {
      const rest = [searchItem];
      if (!looksLikeQuestion(term)) rest.push(askItem);
      groups.push({ title: "Search", items: rest });
    }
    return groups;
  }, [query, ask]);

  const flat = items.flatMap((group) => group.items);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const run = (item) => {
    onClose();
    if (item.run) item.run();
    else navigate(item.to);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, flat.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && flat[active]) {
      event.preventDefault();
      run(flat[active]);
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  let index = -1;

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        className="relative w-full max-w-xl bg-surface border border-line rounded-2xl shadow-[var(--shadow-float)] overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
          <Search size={18} className="text-faint shrink-0" />
          <input
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search, jump to a page, or ask a question"
            aria-label="Search, jump to a page, or ask a question"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={flat[active] ? `palette-${active}` : undefined}
            className="flex-1 bg-transparent text-base placeholder:text-faint focus:outline-none focus-visible:outline-none"
          />
          <kbd className="hidden sm:inline text-xs text-faint border border-line rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div ref={list} id="palette-list" role="listbox" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {items.map((group) => (
            <div key={group.title} className="mb-1 last:mb-0">
              <p className="px-2 pt-2 pb-1 text-xs font-medium text-faint">{group.title}</p>
              {group.items.map((item) => {
                index += 1;
                const position = index;
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    id={`palette-${position}`}
                    data-index={position}
                    role="option"
                    aria-selected={active === position}
                    onMouseMove={() => setActive(position)}
                    onClick={() => run(item)}
                    className={`w-full flex items-center gap-3 px-2 h-10 rounded-lg text-left ${
                      active === position ? "bg-wash" : ""
                    } ${item.accent ? "text-accent font-medium" : ""}`}
                  >
                    <Icon size={16} className={item.accent ? "" : "text-muted"} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {active === position && <CornerDownLeft size={14} className="text-faint" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
