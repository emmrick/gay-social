import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  children: React.ReactNode;
  /** Optional label shown above the retry button */
  label?: string;
  /** Optional custom fallback override */
  fallback?: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
  /** Bumped to force-remount children on retry */
  retryKey: number;
};

/**
 * Local boundary that prevents a single broken section (e.g. the Leaflet map)
 * from blanking the whole app via the global ErrorBoundary. On retry it
 * remounts the children with a fresh key so transient init issues
 * ("Map container is already initialized", aborted fetches…) can recover
 * without a full page reload.
 */
export default class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, retryKey: 0 };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    console.warn("[SectionErrorBoundary]", this.props.label ?? "section", error);
  }

  private handleRetry = () => {
    this.setState((s) => ({
      hasError: false,
      message: undefined,
      retryKey: s.retryKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-5 text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              {this.props.label ?? "Cette section n'a pas pu se charger"}
            </p>
            <p className="text-xs text-muted-foreground">
              Pas besoin de recharger la page, réessaie juste cette section.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={this.handleRetry} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Réessayer
          </Button>
        </div>
      );
    }

    // Remount children when retryKey changes so internal init state resets.
    return (
      <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>
    );
  }
}
