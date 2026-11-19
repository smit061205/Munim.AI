import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";
import { CONTACT_EMAIL, GRIEVANCE_OFFICER, LEGAL_UPDATED } from "../lib/site";

const LegalShell = ({ title, children }) => (
  <div className="min-h-screen bg-canvas text-ink">
    <header className="border-b border-line bg-surface">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
        <Link to="/"><Logo /></Link>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-1">{title}</h1>
      <p className="text-muted mb-8">Last updated {LEGAL_UPDATED}</p>
      <div className="space-y-6 leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_p]:text-ink/90">
        {children}
      </div>
    </main>
  </div>
);

export const PrivacyPage = () => (
  <LegalShell title="Privacy policy">
    <section>
      <h2>What we collect</h2>
      <p>Your name, email and password (stored only as a one-way hash), your answers to the investor questionnaire, and the financial records you add or import: accounts, transactions, investments, debts, goals and insurance. We also keep messages you send to the assistant.</p>
    </section>
    <section>
      <h2>What we use it for</h2>
      <ul>
        <li>To show you your finances and work out returns, tax estimates and reminders</li>
        <li>To answer your questions in the assistant. Only the categories you allow in Settings are sent to the AI model, through OpenRouter</li>
        <li>To send the emails you've chosen: account emails, reminders and the weekly summary</li>
      </ul>
      <p>We don't sell your data or use it for advertising.</p>
    </section>
    <section>
      <h2>Who else handles it</h2>
      <ul>
        <li>MongoDB Atlas stores the database</li>
        <li>Vercel runs the app and server</li>
        <li>OpenRouter and the model provider process assistant messages</li>
        <li>Resend delivers email</li>
        <li>Yahoo Finance and AMFI provide prices; only ticker symbols and fund codes are sent to them</li>
      </ul>
    </section>
    <section>
      <h2>Your rights</h2>
      <p>Under India's Digital Personal Data Protection Act, 2023 you can see, correct, download or delete your data. Download it from Settings, Data and privacy, and delete your account from Settings, Security. Deletion removes your records straight away; backups age out within 30 days.</p>
    </section>
    <section>
      <h2>Grievances</h2>
      <p>Write to {GRIEVANCE_OFFICER} at <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We reply within 30 days. If you're not satisfied, you can complain to the Data Protection Board of India.</p>
    </section>
  </LegalShell>
);

export const TermsPage = () => (
  <LegalShell title="Terms of use">
    <section>
      <h2>Not investment advice</h2>
      <p>Munim.AI is an educational tool for tracking and understanding your money. It is not registered with SEBI as an investment adviser or research analyst, and nothing in it, including the assistant's replies, is a recommendation to buy or sell anything. Tax figures are estimates; check them with a chartered accountant before filing.</p>
    </section>
    <section>
      <h2>Your account</h2>
      <p>Keep your password to yourself. You're responsible for what's done with your account and for the accuracy of what you enter. Read-only links you create can be opened by anyone who has them until they end or you turn them off.</p>
    </section>
    <section>
      <h2>Prices and data</h2>
      <p>Market prices come from third parties and may be delayed or wrong. We aren't liable for decisions made on them.</p>
    </section>
    <section>
      <h2>Changes and ending</h2>
      <p>We may change these terms and will say so in the app. You can stop using Munim.AI and delete your account at any time.</p>
    </section>
    <section>
      <h2>Contact</h2>
      <p><a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </section>
  </LegalShell>
);
