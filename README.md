# Munim.AI

An investing and personal finance app for people in India. Users answer an investor questionnaire, get a target mix of equity, debt and gold, and see their whole financial picture against it, with an AI assistant that answers from their own numbers.

## Features

The app is organised into four sections, with the assistant one keystroke away from any of them:

- **Today**: net worth and its trend, financial health, what needs your attention (budgets over, bills due, insights) with "Ask what to do" buttons, a weekly summary written by AI, and short summaries of the month, investments and goals
- **Money**: transactions with spreadsheet or PDF import and CSV export, tags, notes, splitting, account filter, merchant view and a money flow chart, a warning as soon as a budget is passed, budgets, bills and subscriptions (what's due and what recurs), categorisation rules that learn from corrections, and monthly statements as CSV or PDF
- **Wealth**: net worth broken down by what you own and owe, a forecast with the year you'd reach financial independence, investments (stocks, mutual funds, FDs, RDs, PPF, NPS, gold bonds, US shares, ESOPs and RSUs, crypto, gold and EPF, with daily prices in rupees, XIRR against the Nifty 50, value over time, a SIP tracker, a rebalancing plan and an X-ray for regular plans, overlap, concentration and exit loads), and accounts and loans (banks, credit cards with limit and statement dates, property, vehicles, loans with EMI dates, insurance with a cover check, credit score)
- **Plan**: goals with projections and a "what if I put in more" slider, tax (old against new regime, 80C and 80D, capital gains with a download for the ITR, advance tax dates, tax-loss and tax-free gain harvesting), and calculators for SIPs, retirement, loan prepayment and debt payoff
- **Import**: one place to drop a mutual fund CAS, a demat statement or a bank statement; Munim guesses which it is and shows what it found before saving
- **Search and commands**: ⌘K jumps to any page, adds a transaction, budget, goal or investment, searches transactions, or sends a question to the assistant; ⌘J opens the assistant
- **Assistant**: looks things up with tools, proposes budgets, goals, rules and bill reminders for you to confirm, draws charts, suggests follow-ups, remembers what you ask it to, replies in English, Hindi or Hinglish, and takes voice input
- **Notifications**: bills and EMIs due, budgets nearly used, missed SIPs, goals behind, duplicate charges and price rises, plus a Monday summary email
- **Settings**: profile, risk profile, what the assistant can see, assistant language and memory, weekly email, read-only links for a partner or CA, data export, password, a face or fingerprint lock, and account deletion
- **Help**: common questions, what's new and a feedback form; an admin page shows sign-ups and feedback
- **Install**: works as an app from the home screen on phones and desktops
- A privacy mode that blurs amounts

New accounts start empty, and can load clearly labelled sample data.

## Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Recharts, React Router
- **Backend**: Node.js, Express, MongoDB with Mongoose
- **Auth**: email and password with JWT sessions
- **AI**: OpenRouter, using a low-cost Gemini model by default

## Getting started

You need Node.js 20 or later, a MongoDB database and an [OpenRouter](https://openrouter.ai) API key.

```bash
cd server
npm install
cp .env.example .env
```

Fill in `MONGODB_URI`, `JWT_SECRET` and `OPENROUTER_API_KEY` in `server/.env`, then start the API:

```bash
npm run dev
```

In a second terminal, start the frontend:

```bash
cd Frontend
npm install
npm run dev
```

The app runs at http://localhost:5173 and the API at http://localhost:5001 (from the repository root, `npm run dev:api` and `npm run dev:app` do the same). The app works without an OpenRouter key, but the assistant stays off.

### Deploying

The app and the API both run on Vercel, from the repository root. `vercel.json` builds the frontend from `Frontend`, serves the API from one function (`api/index.js`, which loads `server/app.js`) under `/api`, and runs the daily job at 8am IST.

In the Vercel project, set the Root Directory to the repository root (not `Frontend`), remove any `VITE_API_URL` (the app calls `/api` on its own address), and add:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your Atlas connection string. In Atlas, allow access from anywhere (`0.0.0.0/0`), since Vercel's addresses change |
| `JWT_SECRET` | A long random string (`openssl rand -hex 32`). Sign-in fails without it |
| `CRON_SECRET` | Another long random string. Vercel sends it to the daily job, which refuses calls without it |
| `FRONTEND_URL` | The site's address, e.g. `https://munim-ai.vercel.app`, used in email links |
| `OPENROUTER_API_KEY` | Needed for the assistant, categorisation and statement reading |
| `RESEND_API_KEY`, `EMAIL_FROM` | For password resets, email confirmation and the Monday email |

Redeploy after changing variables. Check what's live with `/api/health`, which returns the deployed commit.

Limits to know: Vercel caps uploads at 4.5 MB, so statements over 4 MB are refused; the Hobby plan runs the daily job once a day, which is all Munim needs.

To make an account an admin (for `/admin`), set its `role` to `admin` in the `users` collection.

Before launch, replace the contact address in `Frontend/src/lib/site.js` and the domain in `Frontend/public/robots.txt` and `sitemap.xml`.

### Upgrading an older database

Back up the database, then run this once before deploying:

```bash
cd server && npm run migrate:remove-clerk
```

It moves data off Clerk IDs, and repairs older imported transactions. Clerk passwords can't be migrated, so those accounts need a new password before they can sign in.

## Assistant

All settings live in `server/.env`:

| Setting | Default | Meaning |
| --- | --- | --- |
| `OPENROUTER_MODEL` | `google/gemini-2.5-flash-lite` | Model used for every user |
| `OPENROUTER_FALLBACK_MODEL` | `google/gemini-3.1-flash-lite` | Used if the main model fails before replying |
| `AI_DAILY_MESSAGE_LIMIT` | none | Messages per user per day, reset at midnight IST. Empty or `0` means no daily cap |
| `AI_PER_MINUTE_LIMIT` | `5` | Burst limit per user |
| `AI_MONTHLY_TOKEN_LIMIT` | `1000000` | Tokens per user per month |
| `AI_CONTEXT_TOKEN_LIMIT` | `16000` | Largest prompt sent for one reply |
| `AI_MAX_OUTPUT_TOKENS` | `1024` | Longest reply |
| `AI_MAX_MESSAGE_CHARS` | `4000` | Longest user message |

Each prompt holds a short snapshot of the user's finances, anything they asked the assistant to remember, the page they're on, the rolling summary and as many recent messages as fit. Older messages are summarised rather than dropped. For anything more specific the model calls tools (`server/services/assistantTools.js`), up to four rounds per reply. Changes it suggests are saved as pending actions and only run when the user presses Confirm. Categories a user turns off in Settings are removed from the prompt and refused by the tools. A message that fails before any reply arrives isn't counted.

Background AI work (categorising transactions, reading unfamiliar statements, the weekly note) counts towards the monthly token limit but not the daily message limit.

## Market data

Mutual fund NAVs come from AMFI's daily file and share prices from Yahoo Finance (NSE, delayed). US shares, crypto and gold come from Yahoo Finance too, converted at the day's dollar rate. Prices refresh when they're more than six hours old, and once a day at 8am IST. Holdings marked "Enter the value myself" are left alone.

## API

Everything except sign-up and sign-in needs an `Authorization: Bearer <token>` header.

| Route | Purpose |
| --- | --- |
| `/api/auth` | Register, sign in, profile, password, account deletion |
| `/api/investor-profile` | Questionnaire and risk profile |
| `/api/wealth` | Overview, reports, assets, debts, EPF, credit score, goals, sample data, export |
| `/api/transactions` | Transactions |
| `/api/budgets` | Budgets |
| `/api/accounts` | Bank accounts |
| `/api/wealth/insurance`, `/api/wealth/bills` | Insurance policies and bill reminders |
| `/api/transactions/rules` | Categorisation rules |
| `/api/investments` | Stocks, funds, other investments, price refresh, fund search, quotes and statement import |
| `/api/tax` | Tax summary and the user's tax details |
| `/api/ingest/excel` | Spreadsheet or PDF bank statement import |
| `/api/permissions` | What the assistant can see |
| `/api/assistant` | Conversations, messages, regenerate, feedback, actions, memory and usage |
| `/api/notifications` | Notifications and the weekly note |
| `/api/share` | Read-only links; `/api/share/view/:token` is public |
| `/api/feedback` | Feedback from the help page |
| `/api/admin` | Stats and feedback, for admins only |
| `/api/cron/daily` | The daily job, called by Vercel with `CRON_SECRET` |

## Disclaimer

Munim.AI is an educational tool. It is not a SEBI-registered adviser and does not give personal investment advice.
