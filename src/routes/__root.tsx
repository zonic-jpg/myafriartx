import { useEffect as useFormHelpers } from "react";
import SiteFooter from "../components/SiteFooter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { NotifyAutoOpen } from "@/components/notify-auto-open";
import { ApprovalGate } from "@/components/ApprovalGate";
import { PasswordRecovery } from "@/components/PasswordRecovery";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display text-foreground">404</h1>
        <p className="mt-4 text-muted-foreground">This page doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MyAfriArtX — Discover African Art" },
      {
        name: "description",
        content:
          "MyAfriArt is a curated marketplace and discovery platform for African art. Explore artists, artworks, and stage pieces in your space with our artstage room tool.",
      },
      { property: "og:title", content: "MyAfriArtX — Discover African Art" },
      { name: "twitter:title", content: "MyAfriArtX — Discover African Art" },
      {
        property: "og:description",
        content:
          "MyAfriArt is a curated marketplace and discovery platform for African art. Explore artists, artworks, and stage pieces in your space with our artstage room tool.",
      },
      {
        name: "twitter:description",
        content:
          "MyAfriArt is a curated marketplace and discovery platform for African art. Explore artists, artworks, and stage pieces in your space with our artstage room tool.",
      },
      { property: "og:image", content: "/og-image.png" },
      { name: "twitter:image", content: "/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <FormHelpers />
        {children}
        {/* Zonic orbit cross-app analytics — see public/orbit-manifest.json */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.ZONIC_APP_ID='myafriart';window.ZONICME_INGEST_URL=window.ZONICME_INGEST_URL||'https://qdhlbplzdblcvvaaluwu.supabase.co/functions/v1/zonic-hub-ingest';",
          }}
        />
        <script src="/auto-refresh.js" defer />
        <script src="/js/zonic-track.js" defer />
        <Scripts />
      </body>
    </html>
  );
}

/** Thin bar at the top while the next page is loading, so a tap always shows it registered. */
function NavPending() {
  const pending = useRouterState({ select: (s) => s.status === "pending" });
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed", top: 0, left: 0, height: 3, zIndex: 9999, pointerEvents: "none",
        background: "var(--primary, #b45309)", opacity: pending ? 1 : 0, width: pending ? "92%" : 0,
        transition: pending ? "width 9s cubic-bezier(0.08, 0.7, 0.2, 1)" : "none",
      }}
    />
  );
}

/** Loads the shared form helpers (password show/hide, date limits) in the browser only. */
function FormHelpers() {
  useFormHelpers(() => {
    void import("../lib/pw-eye.js");
  }, []);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary scope="root">
        <NavPending />
        <ApprovalGate>
          <Outlet />
          <PasswordRecovery brand="MyAfriArt" />
        </ApprovalGate>
        <SiteFooter />
        <NotifyAutoOpen />
        <Toaster richColors position="top-center" />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
