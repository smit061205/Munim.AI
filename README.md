# Munim.AI

An investing and personal finance app for people in India. Users answer an investor questionnaire, get a target mix of equity, debt and gold, and see their whole financial picture against it, with an AI assistant that answers from their own numbers.

## Features

- **Home**: net worth history, financial health score, a weekly note written by AI, insights, what's coming up, and "Ask about this" buttons
- **Portfolio**: stocks, mutual funds, FDs, RDs, PPF, NPS, gold bonds and EPF, with daily NAVs from AMFI and NSE prices, yearly return (XIRR) per holding against the Nifty 50, a SIP tracker, goal links, a rebalancing plan, and CAMS, KFintech, NSDL or CDSL statement import
- **Cash flow**: transactions, budgets, recurring payments and subscriptions, a calendar of what's due, categorisation rules that learn from corrections, AI categorisation, spreadsheet or PDF import, and CSV export
- **Accounts**: bank accounts, property, vehicles, debts with EMI dates, insurance with a cover check, and credit score
- **Goals**: projections from linked investments and SIPs, with on-track or behind status
- **Tax**: old against new regime, 80C and 80D found in your records, capital gains this year, and tax-loss and tax-free gain harvesting
- **Calculators**: SIP, retirement corpus, prepay a loan or invest, and debt payoff, started from your own numbers
- **Reports**: monthly statements with a forecast, as CSV or printed to PDF
- **Assistant**: looks things up with tools, proposes budgets, goals, rules and bill reminders for you to confirm, draws charts, suggests follow-ups, remembers what you ask it to, replies in English, Hindi or Hinglish, and takes voice input
- **Notifications**: bills and EMIs due, budgets nearly used, missed SIPs, goals behind, duplicate charges and price rises, plus a Monday summary email
- **Settings**: profile, risk profile, what the assistant can see, assistant language and memory, weekly email, data export, password and account deletion
- Dark mode, and a privacy mode that blurs amounts

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

The app runs at http://localhost:5173 and the API at http://localhost:5001. The app works without an OpenRouter key, but the assistant stays off.

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
| `AI_DAILY_MESSAGE_LIMIT` | `20` | Messages per user per day, reset at midnight IST |
| `AI_PER_MINUTE_LIMIT` | `5` | Burst limit per user |
| `AI_MONTHLY_TOKEN_LIMIT` | `1000000` | Tokens per user per month |
| `AI_CONTEXT_TOKEN_LIMIT` | `16000` | Largest prompt sent for one reply |
| `AI_MAX_OUTPUT_TOKENS` | `1024` | Longest reply |
| `AI_MAX_MESSAGE_CHARS` | `4000` | Longest user message |

Each prompt holds a short snapshot of the user's finances, anything they asked the assistant to remember, the page they're on, the rolling summary and as many recent messages as fit. Older messages are summarised rather than dropped. For anything more specific the model calls tools (`server/services/assistantTools.js`), up to four rounds per reply. Changes it suggests are saved as pending actions and only run when the user presses Confirm. Categories a user turns off in Settings are removed from the prompt and refused by the tools. A message that fails before any reply arrives isn't counted.

Background AI work (categorising transactions, reading unfamiliar statements, the weekly note) counts towards the monthly token limit but not the daily message limit.

## Market data

Mutual fund NAVs come from AMFI's daily file and share prices from Yahoo Finance (NSE, delayed). Prices refresh when they're more than six hours old, and once a day from 8am IST. Holdings marked "Enter the value myself" are left alone.

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

## Disclaimer

Munim.AI is an educational tool. It is not a SEBI-registered adviser and does not give personal investment advice.
