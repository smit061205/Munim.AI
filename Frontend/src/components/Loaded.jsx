import React from "react";
import { useData } from "../context/DataContext";
import { ErrorState, Skeleton } from "./ui";

// Waits for the overview, then hands it to the page
export default function Loaded({ children }) {
  const { overview, error, refresh } = useData();

  if (error && !overview) {
    return <ErrorState message={error} onRetry={refresh} />;
  }
  if (!overview) {
    return (
      <div className="space-y-4" aria-label="Loading">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  return children(overview);
}
