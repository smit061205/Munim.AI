# Munim.ai Frontend

A React application with Clerk authentication integration, organized with separate pages and components folders.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Clerk Authentication Setup

#### Step 1: Create a Clerk Account

1. Go to [https://clerk.com/](https://clerk.com/) and sign up for a free account
2. Click "Add application" to create a new application
3. Choose your application name (e.g., "Munim.ai")
4. Select your preferred authentication methods (Email, Google, GitHub, etc.)

#### Step 2: Get Your Clerk Keys

1. In your Clerk dashboard, navigate to "API Keys" in the sidebar
2. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
3. Keep your **Secret Key** secure (you won't need it for this frontend-only setup)

#### Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and replace the placeholder with your actual Clerk Publishable Key:
   ```bash
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
   ```

#### Step 4: Configure Clerk Dashboard Settings

In your Clerk dashboard, configure the following settings:

1. **Go to "Paths" in the sidebar:**

   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - Home URL: `/dashboard`
   - After sign-out URL: `/`

2. **Go to "Sessions" (optional):**

   - Set session timeout as needed
   - Configure multi-session handling

3. **Go to "User & Authentication" > "Email, Phone, Username":**
   - Configure which fields are required
   - Set up email verification if needed

### 3. Run the Application

```bash
npm run dev
```

Your app will be available at `http://localhost:5173`

## 🔐 JWT Authentication & Backend Integration

### JWT Token Structure

Clerk provides JWT tokens that can be verified by your backend. The token contains:

```json
{
  "iss": "https://clerk.your-domain.com",
  "sub": "user_2ABC123DEF456",
  "aud": "your-app-id",
  "exp": 1234567890,
  "iat": 1234567890,
  "azp": "your-app-id",
  "session_id": "sess_2ABC123DEF456"
}
```

### User Data Structure

When sending user data to your backend, use this structure:

```json
{
  "id": "user_2ABC123DEF456",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "imageUrl": "https://img.clerk.com/...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Making Authenticated API Calls

Use the `useClerkAuth` hook for backend communication:

```javascript
import { useClerkAuth } from "./utils/auth";

function MyComponent() {
  const { makeAuthenticatedRequest, getUserData } = useClerkAuth();

  const sendDataToBackend = async () => {
    try {
      const userData = getUserData();
      const response = await makeAuthenticatedRequest("/api/user", {
        method: "POST",
        body: JSON.stringify(userData),
      });
      const result = await response.json();
      console.log("Success:", result);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return <button onClick={sendDataToBackend}>Send Data to Backend</button>;
}
```

### Backend Verification (Node.js Example)

```javascript
const { ClerkExpressRequireAuth } = require("@clerk/clerk-sdk-node");

// Middleware to verify JWT
app.use("/api", ClerkExpressRequireAuth());

// Protected route
app.post("/api/user", (req, res) => {
  const userId = req.auth.userId;
  const userData = req.body;

  // Process user data
  console.log("Authenticated user:", userId);
  console.log("User data:", userData);

  res.json({ success: true, userId });
});
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   └── ProtectedRoute.jsx
├── pages/              # Page components
│   ├── LandingPage.jsx    # Home page for unauthenticated users
│   ├── SignInPage.jsx     # Sign-in page
│   ├── SignUpPage.jsx     # Sign-up page
│   └── DashboardPage.jsx  # Protected dashboard
├── utils/              # Utility functions
│   └── auth.js           # JWT authentication utilities
├── App.jsx             # Main app with routing
├── main.jsx           # App entry point with ClerkProvider
└── index.css          # Global styles with dark mode
```

## ✨ Features

- ✅ **Secure Authentication** - Powered by Clerk with JWT tokens
- ✅ **Protected Routes** - Automatic redirects for unauthenticated users
- ✅ **Clean Architecture** - Separated pages and components
- ✅ **Dark Mode** - Modern dark theme throughout
- ✅ **JWT Integration** - Ready for backend API communication
- ✅ **User Management** - Profile, sign-out functionality
- ✅ **Loading States** - Smooth user experience

## 🔐 Authentication Flow

1. **Unauthenticated users** → Landing page with Sign In/Sign Up options
2. **Sign In/Sign Up** → Clerk-hosted authentication forms
3. **Successful authentication** → Automatic redirect to dashboard
4. **Protected routes** → Require authentication, redirect to sign-in if needed
5. **API calls** → Include JWT token in Authorization header
6. **Sign out** → Return to landing page

## 🛠️ Customization

### Styling Clerk Components

You can customize Clerk's appearance in your page components:

```jsx
<SignIn
  appearance={{
    elements: {
      formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-medium",
      card: "shadow-lg border border-gray-200",
      headerTitle: "text-gray-900 font-semibold",
      headerSubtitle: "text-gray-600",
      socialButtonsBlockButton: "border border-gray-300 hover:bg-gray-50",
      formFieldInput:
        "border border-gray-300 focus:border-blue-500 focus:ring-blue-500",
      footerActionLink: "text-blue-600 hover:text-blue-700",
    },
  }}
/>
```

### Adding New Protected Routes

1. Create a new page component in `src/pages/`
2. Add the route in `App.jsx` wrapped with `<ProtectedRoute>`

### Environment Variables

- `VITE_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key (required)

## 🚨 Troubleshooting

### Common Issues

1. **"Missing Publishable Key" Error**

   - Make sure `.env.local` exists and contains your Clerk publishable key
   - Restart your dev server after adding environment variables

2. **Infinite Redirect Loop**

   - Check that your Clerk dashboard paths match your route configuration
   - Ensure your publishable key is correct

3. **Clerk Components Not Loading**

   - Verify your Clerk publishable key is valid
   - Check browser console for any errors

4. **JWT Token Issues**
   - Ensure your backend is configured to verify Clerk JWT tokens
   - Check that the Authorization header is being sent correctly

### Getting Help

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Discord Community](https://clerk.com/discord)
- [GitHub Issues](https://github.com/clerkinc/javascript)

## 📦 Dependencies

- **@clerk/clerk-react**: Clerk authentication for React
- **react-router-dom**: Client-side routing
- **react**: UI library
- **vite**: Build tool and dev server
- **tailwindcss**: Utility-first CSS framework
