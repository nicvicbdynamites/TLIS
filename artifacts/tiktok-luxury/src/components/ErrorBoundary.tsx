// ────────────────────────────────────────────────────────────────────────────
//  Module 10 — App-wide error boundary.
//
//  Catches render-time exceptions in the component tree beneath it and shows
//  a graceful recovery screen instead of a blank white page. Does not catch
//  errors in event handlers, async code, or effects — those are handled by
//  their own try/catch blocks throughout the app.
// ────────────────────────────────────────────────────────────────────────────

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[TLIS] Unhandled render error:", error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    this.setState({ error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="luxury-card max-w-md w-full p-8 text-center space-y-5">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-foreground mb-1">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred while rendering this page. Your data is safe — try reloading,
                or return to the dashboard.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition"
              >
                <Home className="h-3.5 w-3.5" /> Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
