import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requireProfile = true }) {
  const { isSignedIn, isLoaded, user } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-canvas text-muted">
        Loading...
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  // The investor questionnaire must be finished before using the app
  if (requireProfile && !user.investorProfile) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
