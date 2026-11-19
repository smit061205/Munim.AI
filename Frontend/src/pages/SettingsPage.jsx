import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import { downloadFile } from "../lib/format";
import { canUseAppLock, disableAppLock, enableAppLock, lockCredential } from "../lib/appLock";
import RiskProfileSummary from "../components/RiskProfileSummary";
import {
  Button,
  Card,
  ConfirmModal,
  Field,
  FormModal,
  Input,
  PageHeader,
  SectionTitle,
  Select,
  Tabs,
  Toggle,
  useToast,
} from "../components/ui";

const SECTIONS = [
  { value: "profile", label: "Profile" },
  { value: "investor", label: "Investor profile" },
  { value: "privacy", label: "Data and privacy" },
  { value: "preferences", label: "Preferences" },
  { value: "assistant", label: "Assistant" },
  { value: "sharing", label: "Sharing" },
  { value: "security", label: "Security" },
];

const ProfileSection = () => {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
  });
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) =>
    setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await updateProfile(form);
      toast.success("Profile saved");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="First name">
            <Input required value={form.firstName} onChange={set("firstName")} />
          </Field>
          <Field label="Last name">
            <Input value={form.lastName} onChange={set("lastName")} />
          </Field>
        </div>
        <Field label="Email" hint="Email can't be changed yet.">
          <Input disabled value={user.email} />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={form.phone} onChange={set("phone")} />
        </Field>
        <Button type="submit" disabled={busy}>
          Save profile
        </Button>
      </form>
    </Card>
  );
};

const InvestorSection = () => {
  const { user } = useAuth();
  return (
    <Card className="p-5 max-w-2xl">
      <RiskProfileSummary profile={user.investorProfile} />
      <Link
        to="/onboarding"
        className="inline-flex items-center h-10 px-4 mt-6 rounded-lg font-medium bg-surface border border-line-strong hover:bg-wash transition-colors"
      >
        Retake questionnaire
      </Link>
    </Card>
  );
};

const SHARING = [
  { key: "assets", label: "Accounts and assets", description: "Balances, property and vehicles" },
  { key: "liabilities", label: "Debts", description: "Loans and credit cards" },
  { key: "transactions", label: "Transactions", description: "Spending, income and budgets" },
  { key: "investments", label: "Investments", description: "Holdings and allocation" },
  { key: "epf", label: "EPF", description: "Provident fund balance" },
  { key: "creditScore", label: "Credit score", description: "Your latest score" },
];

const PrivacySection = () => {
  const { user, reloadUser } = useAuth();
  const { overview, refresh } = useData();
  const toast = useToast();
  const [permissions, setPermissions] = useState(null);
  const [confirmSample, setConfirmSample] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api("/permissions");
      setPermissions(data.permissions || data.data || data);
    } catch (error) {
      toast.error(error.message);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const change = async (category, allowed) => {
    setPermissions((current) => ({ ...current, [category]: allowed }));
    try {
      await api("/permissions", { method: "PUT", body: { category, allowed } });
    } catch (error) {
      setPermissions((current) => ({ ...current, [category]: !allowed }));
      toast.error(error.message);
    }
  };

  const exportData = async () => {
    try {
      const { data } = await api("/wealth/export");
      downloadFile(
        "munim-data.json",
        JSON.stringify(data, null, 2),
        "application/json",
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  const addSample = async () => {
    try {
      await api("/wealth/sample-data", { method: "POST" });
      await Promise.all([reloadUser(), refresh()]);
      toast.success("Sample data added");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-5">
        <SectionTitle
          title="What the assistant can see"
          description="Anything turned off here is never sent to the AI model."
        />
        {permissions && (
          <div className="divide-y divide-line">
            <Toggle
              label="Assistant"
              description="Turn the assistant on or off"
              checked={permissions.aiChat !== false}
              onChange={(value) => change("aiChat", value)}
            />
            {SHARING.map((item) => (
              <Toggle
                key={item.key}
                label={item.label}
                description={item.description}
                checked={!!permissions[item.key]}
                onChange={(value) => change(item.key, value)}
              />
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <SectionTitle
          title="Your data"
          description="Download everything held for your account, as a JSON file."
        />
        <Button variant="secondary" onClick={exportData}>
          Download my data
        </Button>
      </Card>

      {(user.hasSampleData || overview?.isEmpty) && (
        <Card className="p-5">
          <SectionTitle
            title="Sample data"
            description={
              user.hasSampleData
                ? "Removing it clears every financial record in this account, including anything you added."
                : "Fill your empty account with made-up numbers to explore."
            }
          />
          {user.hasSampleData ? (
            <Button variant="secondary" onClick={() => setConfirmSample(true)}>
              Remove sample data
            </Button>
          ) : (
            <Button variant="secondary" onClick={addSample}>
              Load sample data
            </Button>
          )}
        </Card>
      )}

      {confirmSample && (
        <ConfirmModal
          title="Remove sample data?"
          description="Every financial record in this account will be cleared."
          action="Remove sample data"
          onClose={() => setConfirmSample(false)}
          onConfirm={async () => {
            await api("/wealth/sample-data", { method: "DELETE" });
            await Promise.all([reloadUser(), refresh()]);
            toast.success("Sample data removed");
          }}
        />
      )}
    </div>
  );
};

const INSIGHTS = [
  { key: "budgets", label: "Budget alerts", description: "When a category goes over budget" },
  { key: "allocation", label: "Allocation drift", description: "When your mix moves 10 points from your target" },
  { key: "safety", label: "Safety checks", description: "A thin emergency fund or high-interest debt" },
];

const PreferencesSection = () => {
  const { user, updateProfile } = useAuth();
  const { refresh } = useData();
  const toast = useToast();
  const { dateFormat, insights, weeklyDigest } = user.preferences;

  const save = async (preferences) => {
    try {
      await updateProfile({ preferences });
      await refresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-5">
        <SectionTitle title="Display" description="Amounts are always shown in rupees." />
        <Field label="Date format">
          <Select
            value={dateFormat}
            onChange={(event) => save({ dateFormat: event.target.value })}
            className="sm:max-w-56"
          >
            <option>DD/MM/YYYY</option>
            <option>MM/DD/YYYY</option>
            <option>YYYY-MM-DD</option>
          </Select>
        </Field>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Email" />
        <Toggle
          label="Weekly summary"
          description="Monday morning: net worth, last week's spending, what's due and a short note."
          checked={weeklyDigest !== false}
          onChange={(value) => save({ weeklyDigest: value })}
        />
      </Card>
      <Card className="p-5">
        <SectionTitle title="Insights on Home" description="Choose what Munim.AI points out to you." />
        <div className="divide-y divide-line">
          {INSIGHTS.map((item) => (
            <Toggle
              key={item.key}
              label={item.label}
              description={item.description}
              checked={insights[item.key]}
              onChange={(value) => save({ insights: { [item.key]: value } })}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};

const AssistantSection = () => {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [memories, setMemories] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api("/assistant/memory");
    setMemories(data);
  }, []);

  useEffect(() => {
    load().catch(() => setMemories([]));
  }, [load]);

  const forget = async (id) => {
    await api(`/assistant/memory/${id}`, { method: "DELETE" });
    await load();
    toast.success(id === "all" ? "Memory cleared" : "Forgotten");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-5">
        <SectionTitle title="Language" description="How Munimji replies." />
        <Select
          className="sm:max-w-64"
          aria-label="Reply language"
          value={user.preferences?.assistantLanguage || "auto"}
          onChange={async (event) => {
            try {
              await updateProfile({ preferences: { assistantLanguage: event.target.value } });
            } catch (error) {
              toast.error(error.message);
            }
          }}
        >
          <option value="auto">Match how I write</option>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="hinglish">Hinglish</option>
        </Select>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Memory" description='Things you asked Munimji to remember, used in every conversation. Say "remember that..." in a chat to add one.'>
          {memories?.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => forget("all")}>Forget all</Button>
          )}
        </SectionTitle>
        {memories === null ? null : memories.length === 0 ? (
          <p className="text-muted">Nothing saved yet.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {memories.map((memory) => (
              <li key={memory._id} className="flex items-center justify-between gap-4 py-2">
                <span>{memory.text}</span>
                <Button size="sm" variant="ghost" onClick={() => forget(memory._id)}>Forget</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

const PasswordModal = ({ onClose }) => {
  const toast = useToast();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");

  return (
    <FormModal
      title="Change password"
      submitLabel="Change password"
      onClose={onClose}
      onSubmit={async () => {
        await api("/auth/change-password", {
          method: "POST",
          body: { currentPassword, newPassword },
        });
        toast.success("Password changed");
      }}
    >
      <Field label="Current password">
        <Input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrent(event.target.value)} />
      </Field>
      <Field label="New password" hint="At least 8 characters">
        <Input required type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNext(event.target.value)} />
      </Field>
    </FormModal>
  );
};

const DeleteAccountModal = ({ onClose }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");

  return (
    <FormModal
      title="Delete your account?"
      description="Your profile, financial records and conversations are permanently deleted. This can't be undone."
      submitLabel="Delete my account"
      onClose={onClose}
      onSubmit={async () => {
        await api("/auth/me", { method: "DELETE", body: { password } });
        signOut();
        navigate("/");
      }}
    >
      <Field label="Enter your password to confirm">
        <Input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </Field>
    </FormModal>
  );
};

const AppLockCard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [available, setAvailable] = useState(null);
  const [enabled, setEnabled] = useState(() => !!lockCredential());

  useEffect(() => {
    canUseAppLock().then(setAvailable);
  }, []);

  if (available === null) return null;
  return (
    <Card className="p-5">
      <SectionTitle
        title="Lock with face or fingerprint"
        description={
          available
            ? "Ask for Face ID, Touch ID, a fingerprint or your device PIN when Munim opens on this device."
            : "This device or browser doesn't offer a face, fingerprint or PIN check."
        }
      />
      {available && (
        <Toggle
          label="Lock Munim on this device"
          checked={enabled}
          onChange={async (next) => {
            try {
              if (next) await enableAppLock(user);
              else disableAppLock();
              setEnabled(next);
              toast.success(next ? "Munim will ask to unlock on this device" : "Lock turned off");
            } catch {
              toast.error("The lock wasn't set up. Try again.");
            }
          }}
        />
      )}
    </Card>
  );
};

const SecuritySection = () => {
  const [changing, setChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-5">
        <SectionTitle title="Password" description="Use a password you don't use anywhere else." />
        <Button variant="secondary" onClick={() => setChanging(true)}>
          Change password
        </Button>
      </Card>
      <AppLockCard />
      <Card className="p-5">
        <SectionTitle
          title="Delete account"
          description="Permanently removes your account and everything in it."
        />
        <Button variant="danger" onClick={() => setDeleting(true)}>
          Delete account
        </Button>
      </Card>
      {changing && <PasswordModal onClose={() => setChanging(false)} />}
      {deleting && <DeleteAccountModal onClose={() => setDeleting(false)} />}
    </div>
  );
};

// Read-only links for a partner or a CA. The link is shown once, when made.
const SharingSection = () => {
  const toast = useToast();
  const [links, setLinks] = useState(null);
  const [creating, setCreating] = useState(false);
  const [made, setMade] = useState(null);
  const [form, setForm] = useState({ label: "", days: "30", includeTax: false });

  const load = useCallback(async () => {
    try {
      const { data } = await api("/share");
      setLinks(data);
    } catch (error) {
      toast.error(error.message);
      setLinks([]);
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const urlFor = (token) => `${window.location.origin}/shared/${token}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-5">
        <SectionTitle
          title="Read-only links"
          description="Let a partner, family member or CA see your net worth, investments, goals and, if you choose, your tax summary. They can't change anything or see transactions."
        >
          <Button size="sm" onClick={() => setCreating(true)}>New link</Button>
        </SectionTitle>
        {made && (
          <div className="rounded-lg bg-accent-soft p-3 mb-4 text-sm">
            <p className="font-medium mb-1">Copy this link now. It won't be shown again.</p>
            <div className="flex gap-2">
              <Input readOnly value={urlFor(made.token)} onFocus={(event) => event.target.select()} aria-label="Share link" />
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(urlFor(made.token));
                    toast.success("Link copied");
                  } catch {
                    toast.error("Couldn't copy. Select the link and copy it yourself.");
                  }
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        )}
        {links === null ? (
          <p className="text-muted">Loading...</p>
        ) : links.length === 0 ? (
          <p className="text-muted">No links yet.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {links.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{link.label}</p>
                  <p className="text-sm text-muted">
                    {link.includeTax ? "Includes tax. " : ""}Ends {new Date(link.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.{" "}
                    {link.views ? `Opened ${link.views} ${link.views === 1 ? "time" : "times"}.` : "Not opened yet."}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await api(`/share/${link.id}`, { method: "DELETE" });
                    toast.success("Link turned off");
                    load();
                  }}
                >
                  Turn off
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {creating && (
        <FormModal
          title="New read-only link"
          submitLabel="Create link"
          onClose={() => setCreating(false)}
          onSubmit={async () => {
            const { data } = await api("/share", {
              method: "POST",
              body: { label: form.label, days: Number(form.days), includeTax: form.includeTax },
            });
            setMade(data);
            setForm({ label: "", days: "30", includeTax: false });
            await load();
          }}
        >
          <Field label="Who is it for?">
            <Input required value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="My CA, Priya" />
          </Field>
          <Field label="Works for">
            <Select value={form.days} onChange={(event) => setForm({ ...form, days: event.target.value })}>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.includeTax} onChange={(event) => setForm({ ...form, includeTax: event.target.checked })} />
            Include capital gains and deductions, for filing
          </label>
        </FormModal>
      )}
    </div>
  );
};

const CONTENT = {
  profile: ProfileSection,
  investor: InvestorSection,
  privacy: PrivacySection,
  preferences: PreferencesSection,
  assistant: AssistantSection,
  sharing: SharingSection,
  security: SecuritySection,
};

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const section = CONTENT[params.get("section")] ? params.get("section") : "profile";
  const Content = CONTENT[section];

  return (
    <>
      <PageHeader title="Settings" />
      <Tabs
        tabs={SECTIONS}
        value={section}
        onChange={(value) => setParams({ section: value })}
      />
      <Content />
    </>
  );
}
