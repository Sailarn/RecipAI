"use client";

import { Component, type ReactNode } from "react";
import { captureError } from "@/lib/telemetry";
import { ErrorFallback } from "./error-fallback";

interface PageErrorBoundaryProps {
  children: ReactNode;
}

interface PageErrorBoundaryState {
  failedRenderKey: number;
  hasError: boolean;
}

/**
 * Contains a render error to the one page that threw.
 *
 * Every pushed page lives in the same client tree, so without this a single
 * bad render took the whole app down to Next's generic error page and lost the
 * navigation stack with it. Here the rest of the shell — nav, toasts, the
 * pages underneath — stays alive and the user can retry or navigate away.
 *
 * `captureError` rather than the project's usual re-throw pattern: an error
 * boundary is the one place that must swallow, so it also has to be the place
 * that reports.
 */
export class PageErrorBoundary extends Component<
  PageErrorBoundaryProps,
  PageErrorBoundaryState
> {
  state: PageErrorBoundaryState = { failedRenderKey: 0, hasError: false };

  static getDerivedStateFromError(): Partial<PageErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    captureError(error, { tags: { source: "page-error-boundary" } });
  }

  // Remounting under a new key gives the page a genuinely fresh attempt rather
  // than replaying the state that just threw.
  private readonly retry = () => {
    this.setState((current) => ({
      failedRenderKey: current.failedRenderKey + 1,
      hasError: false,
    }));
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.retry} />;
    }
    return (
      <div key={this.state.failedRenderKey} className="contents">
        {this.props.children}
      </div>
    );
  }
}
