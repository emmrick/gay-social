import React from "react";
import { Button } from "@/components/ui/button";
import { logErrorManually } from "@/services/errorLogService";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
  stack?: string;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
  }

  componentDidCatch(error: unknown) {
    console.error("[ErrorBoundary] Uncaught render error:", error);
    if (error instanceof Error) {
      logErrorManually(error, "error_boundary");
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <div className="space-y-1">
            <h1 className="font-display text-lg font-semibold">Une erreur est survenue</h1>
            <p className="text-sm text-muted-foreground">
              On a évité un écran noir. Tu peux recharger la page.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()} className="flex-1">
              Recharger
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                this.setState({ hasError: false, message: undefined, stack: undefined });
              }}
              className="flex-1"
            >
              Réessayer
            </Button>
          </div>

          {import.meta.env.DEV && (this.state.message || this.state.stack) && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Détails techniques</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">
                {this.state.message}
                {this.state.stack ? `\n\n${this.state.stack}` : ""}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
