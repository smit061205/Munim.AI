import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  Bell,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Goal,
  Landmark,
  LayoutDashboard,
  LogOut,
  Maximize2,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DataProvider } from "../context/DataContext";
import { AssistantProvider, useAssistant } from "../context/AssistantContext";
import AssistantChat from "./AssistantChat";
import CommandPalette from "./CommandPalette";
import { IconButton } from "./ui";
import { api } from "../lib/api";
import { getPrivacy, setPrivacy } from "../lib/display";

const timeAgo = (date) => {
  const minutes = Math.round((Date.now() - new Date(date)) / 60000);
  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
};

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl ";

// Closes a popover when the pointer goes down anywhere outside it
const useOutside = (open, setOpen) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);
  return ref;
};

// Follows privacy mode, which the command palette can change too
const useDisplay = () => {
  const [state, setState] = useState(() => ({ privacy: getPrivacy() }));
  useEffect(() => {
    const update = () => setState({ privacy: getPrivacy() });
    window.addEventListener("munim-display", update);
    return () => window.removeEventListener("munim-display", update);
  }, []);
  return state;
};

const NotificationsBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const wrapper = useOutside(open, setOpen);

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
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-loss text-white text-[10px] leading-4 text-center tnum">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </IconButton>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(24rem,calc(100vw-32px))] bg-surface border border-line rounded-2xl shadow-[var(--shadow-float)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="font-medium">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-sm text-muted hover:text-ink">Mark all read</button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted text-center">Reminders about bills, budgets and unusual spending show up here.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-line">
              {items.map((item) => (
                <li key={item.id}>
                  <button onClick={() => openItem(item)} className="w-full text-left px-4 py-3 hover:bg-wash flex gap-3">
                    <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${item.read ? "bg-transparent" : "bg-accent"}`} aria-hidden="true" />
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

const PrivacyToggle = () => {
  const { privacy } = useDisplay();
  return (
    <IconButton label={privacy ? "Show amounts" : "Hide amounts"} aria-pressed={privacy} onClick={() => setPrivacy(!privacy)}>
      {privacy ? <EyeOff size={18} /> : <Eye size={18} />}
    </IconButton>
  );
};

const NAV = [
  { to: "/today", label: "Today", icon: LayoutDashboard },
  { to: "/money", label: "Money", icon: ArrowLeftRight },
  { to: "/wealth", label: "Wealth", icon: Landmark },
  { to: "/plan", label: "Plan", icon: Goal },
];

export const Logo = ({ className = "" }) => (
  <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
    <img src="/favicon.svg" alt="" className="w-6 h-6" />
    Munim.AI
  </span>
);

const railItem = ({ isActive }) =>
  `group flex items-center gap-3 px-2.5 h-9 rounded-lg text-[15px] transition-colors ${
    isActive ? "bg-surface text-ink font-medium shadow-sm border border-line" : "text-muted hover:text-ink hover:bg-wash border border-transparent"
  }`;

const AccountMenu = ({ compact = false }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { privacy } = useDisplay();
  const [open, setOpen] = useState(false);
  const wrapper = useOutside(open, setOpen);
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();

  const avatar = (
    <span className="w-8 h-8 shrink-0 rounded-full bg-accent-soft text-accent text-sm font-semibold inline-flex items-center justify-center">
      {initials}
    </span>
  );

  const row = "w-full flex items-center gap-2.5 px-3 h-9 text-sm hover:bg-wash rounded-lg";

  return (
    <div ref={wrapper} className="relative">
      <button
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={compact ? "flex" : "w-full flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-wash text-left"}
      >
        {avatar}
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium truncate">{user.firstName} {user.lastName}</span>
              <span className="block text-xs text-muted truncate">{user.investorProfile?.riskLabel || user.email}</span>
            </span>
            <ChevronsUpDown size={14} className="text-faint" />
          </>
        )}
      </button>
      {open && (
        <div className={`absolute z-40 w-64 bg-surface border border-line rounded-2xl shadow-[var(--shadow-float)] p-1.5 ${compact ? "right-0 mt-2" : "left-0 bottom-full mb-2"}`}>
          <div className="px-3 py-2 mb-1">
            <p className="font-medium truncate">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-muted truncate">{user.email}</p>
          </div>
          <Link to="/import" onClick={() => setOpen(false)} className={`${row} lg:hidden`}>
            <Upload size={16} className="text-muted" /> Import a statement
          </Link>
          <Link to="/settings" onClick={() => setOpen(false)} className={row}>
            <Settings size={16} className="text-muted" /> Settings
          </Link>
          <Link to="/assistant" onClick={() => setOpen(false)} className={row}>
            <MessageCircle size={16} className="text-muted" /> Conversation history
          </Link>
          <button onClick={() => setPrivacy(!privacy)} className={row}>
            {privacy ? <Eye size={16} className="text-muted" /> : <EyeOff size={16} className="text-muted" />}
            {privacy ? "Show amounts" : "Hide amounts"}
          </button>
          <div className="h-px bg-line my-1.5" />
          <button
            onClick={() => {
              signOut();
              navigate("/");
            }}
            className={row}
          >
            <LogOut size={16} className="text-muted" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
};

const Rail = ({ onSearch }) => {
  const { isPanelOpen, setPanelOpen } = useAssistant();

  return (
    <aside className="hidden lg:flex no-print fixed inset-y-0 left-0 w-60 flex-col px-3 py-4">
      <Link to="/today" className="px-2.5 h-8 mb-5 flex items-center">
        <Logo />
      </Link>

      <button
        onClick={onSearch}
        className="flex items-center gap-2.5 px-2.5 h-9 mb-5 rounded-lg border border-line bg-surface text-sm text-faint hover:text-muted hover:border-line-strong transition-colors"
      >
        <Search size={15} />
        <span className="flex-1 text-left">Search or ask</span>
        <kbd className="text-xs border border-line rounded px-1.5 py-px">{MOD}K</kbd>
      </button>

      <nav aria-label="Main" className="space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={railItem}>
            <Icon size={18} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 pt-6 border-t border-line space-y-1">
        <NavLink to="/import" className={railItem}>
          <Upload size={18} className="shrink-0" />
          Import
        </NavLink>
        <button
          onClick={() => setPanelOpen(!isPanelOpen)}
          aria-expanded={isPanelOpen}
          className={`w-full ${railItem({ isActive: isPanelOpen })}`}
        >
          <MessageCircle size={18} className="shrink-0" />
          <span className="flex-1 text-left">Ask Munim</span>
          <kbd className="text-xs text-faint border border-line rounded px-1.5 py-px font-normal">{MOD}J</kbd>
        </button>
      </div>

      <div className="mt-auto">
        <AccountMenu />
      </div>
    </aside>
  );
};

const MobileTabs = () => {
  const { isPanelOpen, setPanelOpen } = useAssistant();

  const item = ({ isActive }) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] ${
      isActive ? "text-accent font-medium" : "text-muted"
    }`;

  return (
    <nav
      aria-label="Main"
      className="lg:hidden no-print fixed bottom-0 inset-x-0 z-30 flex border-t border-line bg-surface/95 backdrop-blur h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]"
    >
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={item}>
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
      <button onClick={() => setPanelOpen(!isPanelOpen)} className={item({ isActive: isPanelOpen })}>
        <MessageCircle size={20} />
        Ask
      </button>
    </nav>
  );
};

const SampleNotice = () => {
  const { user } = useAuth();
  if (!user.hasSampleData) return null;
  return (
    <Link
      to="/settings?section=privacy"
      className="hidden sm:inline-flex items-center gap-2 h-7 px-2.5 rounded-full bg-warn-soft text-warn text-xs font-medium hover:opacity-90"
      title="You're viewing sample data. Remove it in Settings when you're ready to add your own."
    >
      <span className="w-1.5 h-1.5 rounded-full bg-warn" aria-hidden="true" />
      Sample data
    </Link>
  );
};

const TopBar = ({ onSearch }) => (
  <header className="no-print sticky top-0 z-20 h-14 flex items-center justify-between gap-3 px-4 lg:px-8 bg-canvas/85 backdrop-blur">
    <div className="flex items-center gap-3 min-w-0">
      <Link to="/today" aria-label="Today" className="lg:hidden shrink-0">
        <img src="/favicon.svg" alt="" className="w-7 h-7" />
      </Link>
      <button
        onClick={onSearch}
        className="lg:hidden flex items-center gap-2 h-9 px-3 rounded-lg border border-line bg-surface text-sm text-faint min-w-0"
      >
        <Search size={15} className="shrink-0" />
        <span className="truncate">Search or ask</span>
      </button>
    </div>
    <div className="flex items-center gap-1 shrink-0">
      <SampleNotice />
      <Link to="/import" className="hidden lg:inline-flex items-center gap-1.5 h-8 px-3 ml-1 rounded-lg text-sm font-medium text-muted hover:text-ink hover:bg-wash">
        <Plus size={16} /> Import
      </Link>
      <PrivacyToggle />
      <NotificationsBell />
      <div className="lg:hidden ml-1">
        <AccountMenu compact />
      </div>
    </div>
  </header>
);

const AssistantPanel = () => {
  const { isPanelOpen, setPanelOpen, startNew } = useAssistant();
  const navigate = useNavigate();
  if (!isPanelOpen) return null;

  return (
    <aside
      aria-label="Assistant"
      className="no-print fixed z-40 inset-0 lg:inset-y-2 lg:right-2 lg:left-auto lg:w-[420px] flex flex-col bg-surface lg:border border-line lg:rounded-2xl lg:shadow-[var(--shadow-float)] overflow-hidden"
    >
      <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-line">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-accent-soft text-accent inline-flex items-center justify-center">
            <MessageCircle size={15} />
          </span>
          <h2 className="font-semibold">Munim</h2>
        </div>
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

const Shell = () => {
  const { isPanelOpen, setPanelOpen } = useAssistant();
  const { pathname } = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (event.key === "j") {
        event.preventDefault();
        setPanelOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setPanelOpen]);

  const panelBeside = isPanelOpen && pathname !== "/assistant";

  return (
    <div className="min-h-screen bg-canvas">
      <Rail onSearch={openPalette} />
      <div className={`lg:pl-60 transition-[padding] duration-200 ${panelBeside ? "xl:pr-[428px]" : ""}`}>
        <TopBar onSearch={openPalette} />
        <main className="@container px-4 lg:px-8 pt-2 pb-28 lg:pb-16 max-w-[1120px] mx-auto">
          <Outlet />
        </main>
      </div>
      {pathname !== "/assistant" && <AssistantPanel />}
      <MobileTabs />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
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
