import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import { downloadFile } from "../lib/format";
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

const CONTENT = {
  profile: ProfileSection,
  investor: InvestorSection,
  privacy: PrivacySection,
  preferences: PreferencesSection,
  assistant: AssistantSection,
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
