import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { CONTACT_EMAIL } from "../lib/site";
import { Button, Card, Field, PageHeader, SectionTitle, Select, useToast } from "../components/ui";

const QUESTIONS = [
  {
    q: "How do I get my mutual funds in?",
    a: "Download your CAS (Consolidated Account Statement) from CAMS or KFintech, then drop the PDF on the Import page. Munim reads every fund, its units and purchases.",
  },
  {
    q: "Where do prices come from?",
    a: "Mutual fund NAVs come from AMFI every day. Indian share prices come from NSE via Yahoo Finance and can be delayed. US shares, crypto and gold are converted to rupees at the day's rate.",
  },
  {
    q: "Is my bank login needed?",
    a: "No. Munim never asks for bank or broker passwords. You import statements or add things by hand.",
  },
  {
    q: "Who can see my data?",
    a: "Only you, plus anyone you give a read-only link to from Settings, Sharing. The assistant only sees the categories you allow in Settings, Data and privacy.",
  },
  {
    q: "Is this investment advice?",
    a: "No. Munim.AI is an educational tool and isn't registered with SEBI as an adviser. Check big decisions with a registered adviser.",
  },
  {
    q: "How do I split a transaction?",
    a: "On Money, use the split button on any transaction to divide it across categories. The parts must add up to the original amount.",
  },
  {
    q: "How do I delete my account?",
    a: "Settings, Security, Delete account. Everything is removed straight away. You can download your data first from Settings, Data and privacy.",
  },
];

// Newest first. Keep each entry to what a person would notice.
const CHANGES = [
  {
    date: "November 2026",
    items: [
      "Credit cards have their own list with limit, statement date and how much of the limit is used",
      "US shares, ESOPs and RSUs, crypto and gold, priced every day in rupees",
      "Portfolio X-ray: regular plans, overlapping funds, concentration and exit loads",
      "Capital gains download for your ITR, and advance tax dates",
      "Tags, notes, splitting and an account filter for transactions, plus a money flow chart",
      "Read-only links for a partner or CA",
      "Password reset and email confirmation",
      "Install Munim on your phone's home screen",
    ],
  },
  {
    date: "October 2026",
    items: ["The app is now organised into Today, Money, Wealth and Plan", "Search and commands with ⌘K"],
  },
];

const FeedbackForm = () => {
  const toast = useToast();
  const { pathname } = useLocation();
  const [kind, setKind] = useState("idea");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      await api("/feedback", { method: "POST", body: { kind, message, page: pathname } });
      setMessage("");
      toast.success("Sent. Thank you.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={send} className="space-y-3">
      <Field label="What is it?">
        <Select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="idea">An idea</option>
          <option value="problem">Something isn't working</option>
          <option value="question">A question</option>
        </Select>
      </Field>
      <Field label="Message">
        <textarea
          required
          minLength={5}
          maxLength={2000}
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="w-full px-3 py-2 bg-surface border border-line-strong rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </Field>
      <Button type="submit" disabled={sending}>{sending ? "Sending..." : "Send"}</Button>
    </form>
  );
};

export default function HelpPage() {
  return (
    <>
      <PageHeader title="Help" description="Answers to common questions, what's new, and a way to reach us." />
      <div className="grid @3xl:grid-cols-5 gap-6">
        <div className="@3xl:col-span-3 space-y-6">
          <Card className="p-5">
            <SectionTitle title="Common questions" />
            <div className="divide-y divide-line">
              {QUESTIONS.map((item) => (
                <details key={item.q} className="py-3 group">
                  <summary className="cursor-pointer font-medium list-none flex justify-between gap-4">
                    {item.q}
                    <span className="text-muted group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
                  </summary>
                  <p className="text-muted mt-2">{item.a}</p>
                </details>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle title="What's new" />
            {CHANGES.map((release) => (
              <div key={release.date} className="mb-4 last:mb-0">
                <p className="font-medium mb-1">{release.date}</p>
                <ul className="list-disc pl-5 text-muted space-y-0.5">
                  {release.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </Card>
        </div>
        <div className="@3xl:col-span-2 space-y-6">
          <Card className="p-5">
            <SectionTitle title="Send feedback" description="Ideas, problems or questions go straight to the team." />
            <FeedbackForm />
          </Card>
          <Card className="p-5 text-sm text-muted space-y-1">
            <p>Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
            <p><Link className="underline" to="/privacy">Privacy policy</Link> and <Link className="underline" to="/terms">terms</Link></p>
          </Card>
        </div>
      </div>
    </>
  );
}
