import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isVerifiedOwner } from "@/lib/foundingOwner";
import { notifyOwner, registerSignup, type ApprovalStatus } from "@/lib/signupApproval";
import { PendingApproval } from "@/components/PendingApproval";

/** Browsing pages that stay open to everyone, signed in or not. */
const PUBLIC_EXACT = new Set(["/", "/login", "/events"]);
const PUBLIC_PREFIX = ["/artist/", "/piece/", "/verify/"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIX.some((p) => pathname.startsWith(p));
}

const FAIL_OPEN_MS = 6_000;

/**
 * Records the signed-in account with the approvals queue and, when the owner
 * has switched "require approvals" on and this account is not yet approved,
 * swaps the app for a waiting screen. The verified owner is never gated, and
 * every failure path resolves to "approved" (fail open): if the RPCs are not
 * deployed yet, or the network hiccups, nobody is locked out by this client.
 */
export function ApprovalGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [user, setUser] = useState<{ id: string; email: string | null; verifiedOwner: boolean } | null>(null);
  const [result, setResult] = useState<{ uid: string; status: ApprovalStatus } | null>(null);

  useEffect(() => {
    const apply = (u: { id: string; email?: string | null; email_confirmed_at?: string | null } | null | undefined) =>
      setUser(
        u ? { id: u.id, email: u.email ?? null, verifiedOwner: isVerifiedOwner(u) } : null,
      );
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => active && apply(data.session?.user))
      .catch(() => undefined);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      // Never await supabase calls inside this callback (deadlocks supabase-js);
      // just record the user and let the effect below do the work.
      apply(s?.user);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const uid = user?.id ?? null;
  const verifiedOwner = user?.verifiedOwner ?? false;
  useEffect(() => {
    if (!uid) return;
    let active = true;
    (async () => {
      const status = await Promise.race<ApprovalStatus>([
        registerSignup("user"),
        new Promise<ApprovalStatus>((r) => window.setTimeout(() => r("approved"), FAIL_OPEN_MS)),
      ]);
      if (!active) return;
      setResult({ uid, status: verifiedOwner ? "approved" : status });
      if (status === "pending" && !verifiedOwner) void notifyOwner("signup");
    })().catch(() => active && setResult({ uid, status: "approved" }));
    return () => {
      active = false;
    };
  }, [uid, verifiedOwner]);

  const resolved = !!user && !user.verifiedOwner && result?.uid === user.id;
  const status: ApprovalStatus = resolved && result ? result.status : "approved";
  const checking = !!user && !user.verifiedOwner && !resolved;

  if (checking && !isPublicPath(pathname)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground" aria-busy="true">
        Loading account…
      </div>
    );
  }
  if (status !== "approved" && !isPublicPath(pathname)) {
    return <PendingApproval rejected={status === "rejected"} email={user?.email} />;
  }
  return <>{children}</>;
}
