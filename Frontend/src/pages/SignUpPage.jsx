import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-900">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        redirectUrl="/dashboard"
        appearance={{
          baseTheme: "dark",
          elements: {
            formButtonPrimary:
              "bg-green-600 hover:bg-green-700 text-white font-medium",
            card: "shadow-lg border border-slate-700 bg-slate-800",
            headerTitle: "text-white font-semibold",
            headerSubtitle: "text-slate-300",
            socialButtonsBlockButton:
              "border border-slate-600 hover:bg-slate-700 text-white",
            formFieldInput:
              "border border-slate-600 focus:border-green-500 focus:ring-green-500 bg-slate-700 text-white",
            footerActionLink: "text-green-400 hover:text-green-300",
            formFieldLabel: "text-slate-300",
            dividerLine: "bg-slate-600",
            dividerText: "text-slate-400",
          },
        }}
      />
    </div>
  );
}
