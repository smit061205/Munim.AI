import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-900">
      <SignIn
        routing="virtual"
        signUpUrl="/sign-up"
        redirectUrl="/dashboard"
        appearance={{
          baseTheme: "dark",
          elements: {
            formButtonPrimary:
              "bg-blue-600 hover:bg-blue-700 text-white font-medium",
            card: "shadow-lg border border-slate-700 bg-slate-800",
            headerTitle: "text-white font-semibold",
            headerSubtitle: "text-slate-300",
            socialButtonsBlockButton:
              "border border-slate-600 hover:bg-slate-700 text-white",
            formFieldInput:
              "border border-slate-600 focus:border-blue-500 focus:ring-blue-500 bg-slate-700 text-white",
            footerActionLink: "text-blue-400 hover:text-blue-300",
            formFieldLabel: "text-slate-300",
            dividerLine: "bg-slate-600",
            dividerText: "text-slate-400",
          },
        }}
      />
    </div>
  );
}
