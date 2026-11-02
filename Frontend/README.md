# Munim.ai Frontend

The React app for Munim.AI, an AI-assisted personal finance and investing product. Built with Vite, Tailwind CSS and framer-motion.

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set `VITE_API_URL` to your API. It defaults to `http://localhost:5001/api`.

3. Start the API from `server/` (see the root README), then run the app:

   ```bash
   npm run dev
   ```

The app runs at `http://localhost:5173`.

## How sign-in works

1. A visitor creates an account at `/sign-up` or signs in at `/sign-in`.
2. The API returns a JWT, which `AuthContext` keeps in `localStorage` and sends as a bearer token.
3. `ProtectedRoute` sends signed-out visitors to `/sign-in`, and anyone without an investor profile to `/onboarding`.
4. `/onboarding` asks the investor questionnaire. The questions come from the API, which also scores the answers.
5. The result is shown once, then lives in Settings, where the questionnaire can be retaken.

## Using auth in a component

```jsx
import { useAuth, useUser } from "../context/AuthContext";

const { getToken, isLoaded, isSignedIn, signOut } = useAuth();
const { user } = useUser(); // includes user.investorProfile

const token = await getToken();
```

## Adding a protected route

Wrap the page in `ProtectedRoute` in `src/App.jsx`:

```jsx
<Route
  path="/my-page"
  element={
    <ProtectedRoute>
      <MyPage />
    </ProtectedRoute>
  }
/>
```

## Project structure

```
src/
├── components/   # Shared UI, including ProtectedRoute and RiskProfileSummary
├── context/      # Auth, permissions and AI chat state
├── pages/        # Route-level pages
├── services/     # API client
├── App.jsx       # Routes and providers
└── main.jsx      # Entry point
```
