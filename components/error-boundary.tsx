"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-8">
          <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
            {/* Icon */}
            <div className="flex size-16 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10">
              <AlertCircle className="size-8 text-destructive" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred while rendering this page. Please try again.
              </p>
            </div>

            {/* Error details (collapsed) */}
            {this.state.error && (
              <details className="w-full rounded-lg border border-border/40 bg-muted/30 p-3 text-left">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                  Error details
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all text-[10px] text-muted-foreground font-mono">
                  {this.state.error.message}
                  {this.state.error.stack ? "\n\n" + this.state.error.stack : ""}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={this.handleReset} className="gap-2">
                <RefreshCw className="size-3.5" />
                Try Again
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/">
                  <Home className="size-3.5" />
                  Go Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
