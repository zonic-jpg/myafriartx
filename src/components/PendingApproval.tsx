import { Clock, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Shown instead of the app while the owner hasn't approved this account. */
export function PendingApproval({ rejected = false, email }: { rejected?: boolean; email?: string | null }) {
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* already signed out */
    }
    window.location.href = "/login";
  };
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-6" role="status">
      <div className="max-w-md space-y-4 text-center">
        {rejected ? (
          <ShieldX className="mx-auto h-10 w-10 text-destructive" aria-hidden />
        ) : (
          <Clock className="mx-auto h-10 w-10 text-amber-500" aria-hidden />
        )}
        <h1 className="font-display text-2xl">{rejected ? "Access not granted" : "Waiting for approval"}</h1>
        <p className="text-sm text-muted-foreground">
          {rejected
            ? "The site owner did not approve this account. If you think that's a mistake, please contact them directly."
            : `Thanks for signing up${email ? ` as ${email}` : ""}. The site owner has been notified and will approve your account shortly. Check again in a moment.`}
        </p>
        <div className="flex justify-center gap-2">
          {!rejected && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Check again
            </button>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
