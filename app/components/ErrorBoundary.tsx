"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/** Props accepted by the ErrorBoundary wrapper. */
interface ErrorBoundaryProps {
  /** Content to render when no error is present. */
  children: ReactNode;
  /** Optional label shown in the error card (e.g. section name). */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches rendering errors in its subtree and displays a styled error card
 * with a retry button. Logs the error details to the console for debugging.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary label="Timeline">
 *   <TimelineSection />
 * </ErrorBoundary>
 * ```
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[ErrorBoundary${this.props.label ? ` – ${this.props.label}` : ""}]`,
      error,
      info.componentStack,
    );
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-red-400">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <span className="text-sm font-mono font-semibold">
              {this.props.label ? `${this.props.label} — ` : ""}Something went wrong
            </span>
          </div>

          <p className="mb-4 text-xs font-mono text-slate-400 max-w-md mx-auto break-words">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>

          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-mono font-semibold text-red-400 transition-colors hover:bg-red-500/20 hover:border-red-500/50"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
              />
            </svg>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
