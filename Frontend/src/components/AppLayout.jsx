import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  Bell,
  Calculator,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Goal,
  Home,
  Landmark,
  LogOut,
  Maximize2,
  MessageCircle,
  PieChart,
  Plus,
  Search,
  Settings,
  FileText,
  Receipt,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DataProvider } from "../context/DataContext";
import { AssistantProvider, useAssistant } from "../context/AssistantContext";
import AssistantChat from "./AssistantChat";
import { IconButton } from "./ui";
import { api } from "../lib/api";
import { getPrivacy, getTheme, setPrivacy, setTheme } from "../lib/display";

const timeAgo = (date) => {
  const minutes = Math.round((Date.now() - new Date(date)) / 60000);
  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
};

const NotificationsBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const wrapper = useRef(null);

  const load = async () => {
    try {
      const result = await api("/notifications");
      setItems(result.data);
      setUnread(result.unread);
    } catch {
      // The bell just stays quiet
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!wrapper.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const markAll = async () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    setUnread(0);
    await api("/notifications/all/read", { method: "POST" }).catch(() => {});
  };

  const openItem = async (item) => {
    setOpen(false);
    if (!item.read) {
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
      setUnread((count) => Math.max(count - 1, 0));
      api(`/notifications/${item.id}/read`, { method: "POST" }).catch(() => {});
    }
    if (item.href) navigate(item.href);
  };

  return (
    <div ref={wrapper} className="relative">
      <IconButton label={unread ? `Notifications, ${unread} unread` : "Notifications"} aria-expanded={open} onClick={() => setOpen(!open)} className="relative">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-loss text-white text-[10px] leading-4 text-center tnum">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </IconButton>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-32px))] bg-surface border border-line rounded-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-line">
            <p className="font-medium">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-sm text-muted hover:text-ink">Mark all read</button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted text-center">Reminders about bills, budgets and unusual spending show up here.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-line">
              {items.map((item) => (
                <li key={item.id}>
                  <button onClick={() => openItem(item)} className="w-full text-left px-3 py-2.5 hover:bg-wash flex gap-2">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${item.read ? "bg-transparent" : "bg-accent"}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className={`block text-sm ${item.read ? "" : "font-medium"}`}>{item.title}</span>
                      {item.body && <span className="block text-sm text-muted">{item.body}</span>}
                      <span className="block text-xs text-faint mt-0.5">{timeAgo(item.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const DisplayToggles = () => {
  const [theme, setThemeState] = useState(getTheme);
  const [privacy, setPrivacyState] = useState(getPrivacy);

  return (
    <>
      <IconButton
        label={privacy ? "Show amounts" : "Hide amounts"}
        aria-pressed={privacy}
        onClick={() => {
          setPrivacy(!privacy);
          setPrivacyState(!privacy);
        }}
      >
        {privacy ? <EyeOff size={18} /> : <Eye size={18} />}
      </IconButton>
      <IconButton
        label={theme === "dark" ? "Light mode" : "Dark mode"}
        onClick={() => {
          const next = theme === "dark" ? "light" : "dark";
          setTheme(next);
          setThemeState(next);
        }}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </IconButton>
    </>
  );
};

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/portfolio", label: "Portfolio", icon: PieChart },
  { to: "/cash-flow", label: "Cash flow", icon: ArrowLeftRight },
  { to: "/accounts", label: "Accounts", icon: Landmark },
  { to: "/goals", label: "Goals", icon: Goal },
  { to: "/tax", label: "Tax", icon: Receipt },
  { to: "/calculators", label: "Calculators", icon: Calculator },
  { to: "/reports", label: "Reports", icon: FileText },
];

export const Logo = ({ className = "" }) => (
  <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
    <img src="/favicon.svg" alt="" className="w-6 h-6" />
    Munim.AI
  </span>
);

const railItem = ({ isActive }) =>
  `flex items-center gap-3 px-3 h-9 rounded-lg transition-colors ${
    isActive
      ? "bg-accent-soft text-accent font-medium"
      : "text-muted hover:text-ink hover:bg-wash"
  }`;

const Rail = () => {
  const { isPanelOpen, setPanelOpen } = useAssistant();

  return (
    <aside className="hidden lg:flex no-print fixed inset-y-0 left-0 w-52 flex-col border-r border-line bg-canvas px-3 py-4">
      <Link to="/home" className="px-3 h-8 mb-6 flex items-center">
        <Logo />
      </Link>
      <nav aria-label="Main" className="flex-1 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={railItem}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-0.5">
        <button
          onClick={() => setPanelOpen(!isPanelOpen)}
          aria-expanded={isPanelOpen}
          className={`w-full ${railItem({ isActive: isPanelOpen })}`}
        >
          <MessageCircle size={18} />
          Assistant
        </button>
        <NavLink to="/settings" className={railItem}>
          <Settings size={18} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
};

const MobileTabs = () => {
  const { isPanelOpen, setPanelOpen } = useAssistant();
  const items = NAV.slice(0, 4);

  const item = ({ isActive }) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] ${
      isActive ? "text-accent font-medium" : "text-muted"
    }`;

  return (
    <nav
      aria-label="Main"
      className="lg:hidden no-print fixed bottom-0 inset-x-0 z-30 h-16 flex border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)]"
    >
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={item}>
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
      <button
        onClick={() => setPanelOpen(!isPanelOpen)}
        className={item({ isActive: isPanelOpen })}
      >
        <MessageCircle size={20} />
        Assistant
      </button>
    </nav>
  );
};

const SEARCH_PAGES = [
  ...NAV.map(({ to, label }) => ({ to, label })),
  { to: "/cash-flow?tab=budgets", label: "Budgets" },
  { to: "/calculators?tab=sip", label: "SIP calculator" },
  { to: "/calculators?tab=retirement", label: "Retirement calculator" },
  { to: "/calculators?tab=prepay", label: "Prepay or invest" },
  { to: "/portfolio", label: "Rebalancing plan" },
  { to: "/portfolio", label: "Import mutual fund statement" },
  { to: "/portfolio", label: "Holdings" },
  { to: "/portfolio", label: "EPF" },
  { to: "/accounts", label: "Credit score" },
  { to: "/settings?section=privacy", label: "Data and privacy" },
  { to: "/settings?section=investor", label: "Risk profile" },
];

const SearchBox = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    const pages = SEARCH_PAGES.filter((page) =>
      page.label.toLowerCase().includes(term),
    ).slice(0, 5);
    return [
      ...pages,
      {
        to: `/cash-flow?q=${encodeURIComponent(query.trim())}`,
        label: `Search transactions for "${query.trim()}"`,
      },
    ];
  }, [query]);

  const go = (to) => {
    navigate(to);
    setQuery("");
    setOpen(false);
    input.current?.blur();
  };

  return (
    <div className="relative w-full max-w-sm">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
      />
      <input
        ref={input}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results.length) go(results[0].to);
          if (event.key === "Escape") input.current?.blur();
        }}
        placeholder="Search"
        aria-label="Search pages and transactions"
        className="w-full h-9 pl-9 pr-3 rounded-lg bg-wash placeholder:text-faint focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-40 mt-1 w-full bg-surface border border-line rounded-lg py-1">
          {results.map((result) => (
            <li key={result.label}>
              <button
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => go(result.to)}
                className="w-full text-left px-3 py-2 hover:bg-wash truncate"
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const AccountMenu = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!wrapper.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`;

  return (
    <div ref={wrapper} className="relative">
      <button
        aria-label="Account"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-accent text-canvas text-sm font-medium"
      >
        {initials.toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-60 bg-surface border border-line rounded-lg py-1">
          <div className="px-3 py-2 border-b border-line">
            <p className="font-medium truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-muted truncate">{user.email}</p>
          </div>
          {/* The phone tab bar only has room for the first four pages */}
          {NAV.slice(4).map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 hover:bg-wash"
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-wash"
          >
            <Settings size={16} /> Settings
          </Link>
          <button
            onClick={() => {
              signOut();
              navigate("/");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-wash"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
};

const TopBar = () => {
  const { pathname } = useLocation();
  return (
    <header className="no-print sticky top-0 z-20 h-14 flex items-center justify-between gap-4 px-4 lg:px-8 bg-canvas/95 backdrop-blur border-b border-line">
      <Link to="/home" aria-label="Home" className="lg:hidden shrink-0">
        <img src="/favicon.svg" alt="" className="w-7 h-7" />
      </Link>
      <SearchBox key={pathname} />
      <div className="flex items-center gap-1 shrink-0">
        <DisplayToggles />
        <NotificationsBell />
        <Link
          to="/settings"
          aria-label="Settings"
          className="lg:hidden inline-flex items-center justify-center w-8 h-8 text-muted"
        >
          <Settings size={18} />
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
};

const AssistantPanel = () => {
  const { isPanelOpen, setPanelOpen, startNew } = useAssistant();
  const navigate = useNavigate();
  if (!isPanelOpen) return null;

  return (
    <aside
      aria-label="Assistant"
      className="no-print fixed z-40 inset-0 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[400px] flex flex-col bg-canvas lg:border-l border-line"
    >
      <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-line">
        <h2 className="font-semibold">Assistant</h2>
        <div className="flex gap-0.5">
          <IconButton label="New conversation" onClick={startNew}>
            <Plus size={18} />
          </IconButton>
          <IconButton
            label="Open full page with history"
            onClick={() => {
              setPanelOpen(false);
              navigate("/assistant");
            }}
          >
            <Maximize2 size={16} />
          </IconButton>
          <IconButton label="Close assistant" onClick={() => setPanelOpen(false)}>
            <X size={18} />
          </IconButton>
        </div>
      </div>
      <AssistantChat />
    </aside>
  );
};

const SampleBanner = () => {
  const { user } = useAuth();
  if (!user.hasSampleData) return null;
  return (
    <div className="no-print px-4 lg:px-8 py-2 bg-warn-soft text-warn text-sm">
      You're viewing sample data. Remove it in{" "}
      <Link to="/settings?section=privacy" className="underline">
        Settings
      </Link>{" "}
      when you're ready to add your own.
    </div>
  );
};

const Shell = () => {
  const { isPanelOpen } = useAssistant();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-canvas">
      <Rail />
      <div
        className={`lg:pl-52 transition-[padding] ${
          isPanelOpen && pathname !== "/assistant" ? "xl:pr-[400px]" : ""
        }`}
      >
        <TopBar />
        <SampleBanner />
        <main className="@container px-4 lg:px-8 py-8 pb-24 lg:pb-12 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
      {pathname !== "/assistant" && <AssistantPanel />}
      <MobileTabs />
    </div>
  );
};

export default function AppLayout() {
  return (
    <DataProvider>
      <AssistantProvider>
        <Shell />
      </AssistantProvider>
    </DataProvider>
  );
}

