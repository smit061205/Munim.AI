# Munim.AI

An investing and personal finance app for people in India. Users answer an investor questionnaire, get a target mix of equity, debt and gold, and see their whole financial picture against it, with an AI assistant that answers from their own numbers.

## Features

- **Home**: net worth history, financial health score, insights, portfolio mix, spending and cash flow
- **Portfolio**: stocks, mutual funds and EPF, compared with the target allocation, with a rebalancing plan and CAMS or KFintech statement import
- **Cash flow**: transactions, budgets, spreadsheet import and CSV export
- **Accounts**: bank accounts, property, vehicles, debts and credit score
- **Goals**: target amounts and dates, with the monthly saving each one needs
- **Calculators**: SIP, retirement corpus, and prepay a loan or invest, started from your own numbers
- **Reports**: monthly statements with a forecast, as CSV or printed to PDF
- **Assistant**: streaming answers, saved conversations, spreadsheet attachments and per-user limits
- **Settings**: profile, risk profile, what the assistant can see, data export, password and account deletion

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

Each prompt holds a snapshot of the user's finances, the rolling summary and as many recent messages as fit. Older messages are summarised rather than dropped. Categories a user turns off in Settings are removed on the server before the prompt is built. A message that fails before any reply arrives isn't counted.

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
| `/api/investments` | Stocks, mutual funds and statement import |
| `/api/ingest/excel` | Spreadsheet import |
| `/api/permissions` | What the assistant can see |
| `/api/assistant` | Conversations, messages and usage |

## Disclaimer

Munim.AI is an educational tool. It is not a SEBI-registered adviser and does not give personal investment advice.
