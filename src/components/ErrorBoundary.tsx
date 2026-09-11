import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Optional label so console logs identify which boundary caught the error. */
  scope?: string;
};

type State = {
  error: Error | null;
};

/**
 * Top-level React error boundary.
 *
 * Catches render-time errors anywhere in its subtree (class components are the
 * only way to do this — there is no hook equivalent) so a single broken
 * component cannot take down the whole page with a blank white screen. Logs
 * the error for diagnostics and shows a friendly fallback with a reload
 * action, which resets whatever bad state caused the crash.
 *
 * This is defense-in-depth on top of the router's own per-route error
 * boundaries (see errorComponent in src/routes/__root.tsx) — it also covers
 * anything rendered outside the matched route tree (layout chrome, providers,
 * third-party widgets) and any error the router boundary itself fails to
 * catch.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.scope ? `:${this.props.scope}` : ""}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl text-foreground">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          An unexpected error occurred and this part of the page could not be displayed. Reloading
          usually fixes it — your data on the server is safe.
        </p>
        {import.meta.env.DEV && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md border border-border bg-muted p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
        <button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
