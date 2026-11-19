import React from "react";

// Catches a crash in one page so the rest of the app keeps working, and offers
// a reload. A failed lazy chunk after a deploy is the usual cause.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info?.componentStack);
  }

  componentDidUpdate(previous) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="py-16 text-center max-w-md mx-auto px-4">
        <h2 className="text-lg font-semibold mb-1">This page hit a problem</h2>
        <p className="text-muted mb-5">Your data is safe. Reloading usually fixes it, especially just after an update.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-9 px-4 rounded-lg bg-accent text-canvas text-sm font-medium hover:bg-accent-hover"
        >
          Reload
        </button>
      </div>
    );
  }
}
