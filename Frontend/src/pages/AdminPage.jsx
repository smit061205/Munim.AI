import React, { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDayMonth } from "../lib/format";
import { Badge, Button, Card, ErrorState, PageHeader, SectionTitle, Skeleton, Stat, StatStrip } from "../components/ui";

const STATUS_TONE = { new: "warn", seen: "neutral", done: "gain" };

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [statsResult, feedbackResult] = await Promise.all([api("/admin/stats"), api("/admin/feedback")]);
      setStats(statsResult.data);
      setFeedback(feedbackResult.data);
      setError(null);
    } catch (failure) {
      setError(failure.message);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [load, user]);

  if (user?.role !== "admin") return <Navigate to="/today" replace />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats) return <Skeleton className="h-64" />;

  const { users } = stats;
  const peak = Math.max(1, ...stats.signups.map((row) => row.count));
  const setStatus = async (id, status) => {
    await api(`/admin/feedback/${id}`, { method: "PATCH", body: { status } });
    setFeedback(feedback.map((row) => (row._id === id ? { ...row, status } : row)));
  };

  return (
    <>
      <PageHeader title="Admin" description="Sign-ups, activation and feedback." />
      <StatStrip>
        <Stat label="Accounts" value={users.total}>
          <span className="text-muted tnum">{users.last7} in the last 7 days</span>
        </Stat>
        <Stat label="Finished the questionnaire" value={`${Math.round((users.withProfile / Math.max(users.total, 1)) * 100)}%`} />
        <Stat label="Added transactions" value={users.withTransactions} />
        <Stat label="Email confirmed" value={users.verified} />
      </StatStrip>

      <div className="grid @3xl:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionTitle title="Sign-ups, last 30 days" description={`${users.last30} in all. ${users.sample} accounts use sample data. ${stats.shareLinks} share links are live.`} />
          {stats.signups.length ? (
            <ul className="space-y-1">
              {stats.signups.map((row) => (
                <li key={row.date} className="flex items-center gap-3 text-sm">
                  <span className="w-16 text-muted tnum">{formatDayMonth(row.date)}</span>
                  <span className="flex-1 h-2 rounded-full bg-wash overflow-hidden">
                    <span className="block h-full bg-accent rounded-full" style={{ width: `${(row.count / peak) * 100}%` }} />
                  </span>
                  <span className="w-6 text-right tnum">{row.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No sign-ups in the last 30 days.</p>
          )}
        </Card>
        <Card className="p-5">
          <SectionTitle title="Feedback" description={`${stats.feedbackNew} new`} />
          {feedback.length ? (
            <ul className="divide-y divide-line">
              {feedback.map((row) => (
                <li key={row._id} className="py-3">
                  <div className="flex items-center gap-2 text-sm text-muted mb-1">
                    <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
                    <span>{row.kind}</span>
                    <span>{formatDayMonth(row.created_at)}</span>
                    {row.page && <span className="truncate">{row.page}</span>}
                  </div>
                  <p className="whitespace-pre-wrap">{row.message}</p>
                  {row.status !== "done" && (
                    <div className="flex gap-2 mt-2">
                      {row.status === "new" && <Button size="sm" variant="secondary" onClick={() => setStatus(row._id, "seen")}>Mark seen</Button>}
                      <Button size="sm" variant="secondary" onClick={() => setStatus(row._id, "done")}>Mark done</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No feedback yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}
