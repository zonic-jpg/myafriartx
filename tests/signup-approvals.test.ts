import { beforeEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/* ── safeRedirect: the owner's email deep link must survive sign-in ─────────── */
import { safeRedirect } from "../src/lib/safeRedirect";

describe("safeRedirect", () => {
  it("keeps the query string of an admin deep link", () => {
    expect(safeRedirect("/admin?tab=approvals")).toBe("/admin?tab=approvals");
    expect(safeRedirect("/admin?tab=approvals#queue")).toBe("/admin?tab=approvals#queue");
  });
  it("rejects off-site, protocol-relative and login-loop targets", () => {
    expect(safeRedirect("https://evil.example/admin")).toBeNull();
    expect(safeRedirect("//evil.example")).toBeNull();
    expect(safeRedirect("/\\evil.example")).toBeNull();
    expect(safeRedirect("/login")).toBeNull();
    expect(safeRedirect("/login?redirect=/admin")).toBeNull();
    expect(safeRedirect(undefined)).toBeNull();
    expect(safeRedirect("admin")).toBeNull();
  });
});

/* ── client RPC wrapper fails OPEN ──────────────────────────────────────────── */
// Plain function (not vi.fn): vitest reports a throwing/rejecting spy as a failure even when the code under test handles it.
type RpcResult = { data: unknown; error: { message: string } | null };
let rpcImpl: () => Promise<RpcResult> = async () => ({ data: null, error: null });
const rpc = {
  mockReset: () => void (rpcImpl = async () => ({ data: null, error: null })),
  mockResolvedValue: (v: RpcResult) => void (rpcImpl = async () => v),
  mockFail: () => void (rpcImpl = () => new Promise<RpcResult>((_, rej) => setTimeout(() => rej(new Error("Failed to fetch")), 0))),
};
vi.mock("../src/integrations/supabase/client", () => ({ supabase: { rpc: () => rpcImpl() } }));

describe("signupApproval client (fail open)", () => {
  beforeEach(() => rpc.mockReset());

  it("treats a missing RPC (migration not applied) as approved", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Could not find the function public.register_signup" } });
    const { registerSignup } = await import("../src/lib/signupApproval");
    expect(await registerSignup()).toBe("approved");
  });

  it("treats a thrown network error as approved", async () => {
    rpc.mockFail();
    const { registerSignup } = await import("../src/lib/signupApproval");
    expect(await registerSignup()).toBe("approved");
  });

  it("passes pending / rejected through", async () => {
    const { registerSignup } = await import("../src/lib/signupApproval");
    rpc.mockResolvedValue({ data: { status: "pending" }, error: null });
    expect(await registerSignup()).toBe("pending");
    rpc.mockResolvedValue({ data: { status: "rejected" }, error: null });
    expect(await registerSignup()).toBe("rejected");
  });

  it("returns null for the queue when the RPC is missing", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "missing" } });
    const { fetchSignupQueue } = await import("../src/lib/signupApproval");
    expect(await fetchSignupQueue()).toBeNull();
  });

  it("deep-links the approvals tab on the real admin route", async () => {
    const { APPROVALS_PATH } = await import("../src/lib/signupApproval");
    expect(APPROVALS_PATH).toBe("/admin?tab=approvals");
  });
});

/* ── owner notification: fixed recipient, one email per row, soft-fail ──────── */
import { HOURLY_CAP, approvalsLink, notifyOwnerForUser } from "../src/lib/signup-approval.server";

type Row = Record<string, unknown>;

/** Tiny in-memory stand-in for the supabase-js query builder (signup_approvals only). */
function fakeAdmin(row: Row | null, recentCount = 0) {
  const state = { row: row ? { ...row } : null };
  const admin = {
    state,
    from: (_t: string) => {
      let mode: "select" | "update" = "select";
      let patch: Row = {};
      let head = false;
      const filters: Array<(r: Row) => boolean> = [];
      const chain: any = {
        select: (_c?: string, opts?: { head?: boolean }) => {
          head = !!opts?.head;
          return chain;
        },
        update: (p: Row) => {
          mode = "update";
          patch = p;
          return chain;
        },
        eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), chain),
        is: (k: string, v: unknown) => (filters.push((r) => (r[k] ?? null) === v), chain),
        gte: () => chain,
        maybeSingle: async () => ({ data: state.row, error: null }),
        then: (res: (v: unknown) => unknown) => {
          if (head) return Promise.resolve({ count: recentCount, error: null }).then(res);
          if (mode === "update") {
            const hit = state.row && filters.every((f) => f(state.row!));
            if (hit) Object.assign(state.row!, patch);
            return Promise.resolve({ data: hit ? [{ user_id: state.row!.user_id }] : [], error: null }).then(res);
          }
          return Promise.resolve({ data: state.row ? [state.row] : [], error: null }).then(res);
        },
      };
      return chain;
    },
  };
  return admin;
}

const pendingRow = {
  user_id: "u1",
  email: "tester@example.com",
  status: "pending",
  notified_at: null,
  admin_requested_at: null,
  admin_notified_at: null,
};
const ok = () => Promise.resolve(new Response("{}", { status: 200 }));

describe("notifyOwnerForUser", () => {
  it("emails ONLY the founding owner, with the approvals deep link", async () => {
    const admin = fakeAdmin(pendingRow);
    const f = vi.fn(ok);
    const r = await notifyOwnerForUser(admin as never, "u1", "signup", { resendKey: "k", appUrl: "https://app.example/" }, f as never);
    expect(r).toEqual({ sent: true });
    const body = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string);
    expect(body.to).toEqual(["oadeagbo@gmail.com"]);
    expect(body.html).toContain("https://app.example/admin?tab=approvals");
    expect(body.html).toContain("tester@example.com");
  });

  it("sends one email per pending row (second call is claimed already)", async () => {
    const admin = fakeAdmin(pendingRow);
    const f = vi.fn(ok);
    await notifyOwnerForUser(admin as never, "u1", "signup", { resendKey: "k" }, f as never);
    const again = await notifyOwnerForUser(admin as never, "u1", "signup", { resendKey: "k" }, f as never);
    expect(again.sent).toBe(false);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("without a local RESEND_API_KEY it uses the shared relay (fixed app id, no recipient)", async () => {
    const admin = fakeAdmin(pendingRow);
    const f = vi.fn(ok);
    const r = await notifyOwnerForUser(admin as never, "u1", "signup", {}, f as never);
    expect(r.sent).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toMatch(/owner-mail-relay$/);
    const body = JSON.parse(init.body);
    expect(body.app).toBe("myafriart");
    expect(body.to).toBeUndefined();
  });

  it("releases the claim when the relay fails", async () => {
    const admin = fakeAdmin(pendingRow);
    const f = vi.fn(async () => ({ ok: false, status: 502 }) as never);
    const r = await notifyOwnerForUser(admin as never, "u1", "signup", {}, f as never);
    expect(r.sent).toBe(false);
    expect(admin.state.row!.notified_at).toBeNull();
  });

  it("releases the claim when the provider errors so a later attempt can retry", async () => {
    const admin = fakeAdmin(pendingRow);
    const f = vi.fn(() => Promise.resolve(new Response("no", { status: 500 })));
    const r = await notifyOwnerForUser(admin as never, "u1", "signup", { resendKey: "k" }, f as never);
    expect(r.sent).toBe(false);
    expect(admin.state.row!.notified_at).toBeNull();
  });

  it("applies the hourly cap", async () => {
    const admin = fakeAdmin(pendingRow, HOURLY_CAP);
    const f = vi.fn(ok);
    const r = await notifyOwnerForUser(admin as never, "u1", "signup", { resendKey: "k" }, f as never);
    expect(r).toEqual({ sent: false, reason: "rate limited" });
    expect(f).not.toHaveBeenCalled();
  });

  it("does nothing for an already-approved account or the owner themself", async () => {
    const f = vi.fn(ok);
    const approved = fakeAdmin({ ...pendingRow, status: "approved" });
    expect((await notifyOwnerForUser(approved as never, "u1", "signup", { resendKey: "k" }, f as never)).sent).toBe(false);
    const owner = fakeAdmin({ ...pendingRow, email: "oadeagbo@gmail.com" });
    expect((await notifyOwnerForUser(owner as never, "u1", "signup", { resendKey: "k" }, f as never)).sent).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("admin_request needs an actual request and uses its own claim column", async () => {
    const f = vi.fn(ok);
    const none = fakeAdmin({ ...pendingRow, status: "approved" });
    expect((await notifyOwnerForUser(none as never, "u1", "admin_request", { resendKey: "k" }, f as never)).sent).toBe(false);
    const asked = fakeAdmin({ ...pendingRow, status: "approved", admin_requested_at: "2026-10-04T10:00:00Z" });
    expect((await notifyOwnerForUser(asked as never, "u1", "admin_request", { resendKey: "k" }, f as never)).sent).toBe(true);
    expect(asked.state.row!.admin_notified_at).toBeTruthy();
    expect(asked.state.row!.notified_at).toBeNull();
  });

  it("falls back to the production URL for a missing/garbage PUBLIC_APP_URL", () => {
    expect(approvalsLink(undefined)).toBe("https://myafriartx.netlify.app/admin?tab=approvals");
    expect(approvalsLink("javascript:alert(1)")).toBe("https://myafriartx.netlify.app/admin?tab=approvals");
  });
});

/* ── no shared admin password anywhere in the repo ──────────────────────────── */
describe("no shared admin password", () => {
  // Built from pieces so this file never contains the retired value itself.
  const needle = new RegExp(["zonic", "gate"].join(""), "i");
  const root = join(__dirname, "..");
  const skip = new Set(["node_modules", ".git", "dist", "artifacts", "test-results", "playwright-report"]);

  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      if (skip.has(name)) continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full, out);
      else if (/\.(ts|tsx|mjs|js|sql|md|json|toml|example)$/.test(name) && st.size < 2_000_000) out.push(full);
    }
    return out;
  }

  it("does not appear in src, functions, migrations, tests, docs or config", () => {
    const dirs = ["src", "netlify", "supabase", "tests", "e2e", "docs"].map((d) => join(root, d));
    const files = [...dirs.flatMap((d) => walk(d)), join(root, ".env.example"), join(root, "netlify.toml")];
    const hits = files.filter((f) => {
      try {
        return needle.test(readFileSync(f, "utf8"));
      } catch {
        return false;
      }
    });
    expect(hits).toEqual([]);
  });
});
