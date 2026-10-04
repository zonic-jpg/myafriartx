import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/admin-bridge authorisation: a verified admin JWT or the VERIFIED founding
 * owner only. A password header (the retired shared-password path) must never
 * authorise anything, and an unverified owner-email account is just a stranger.
 */
let currentUser: Record<string, unknown> | null = null;
let adminRole = false;
const insertSpy = vi.fn(() => Promise.resolve({ data: null, error: null }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        maybeSingle: vi.fn(() => Promise.resolve({ data: adminRole ? { id: "r1" } : null, error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        insert: insertSpy,
      };
      // events.list awaits the chain after .order()
      chain.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res);
      return chain;
    }),
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: currentUser } })) },
  })),
}));
vi.mock("ws", () => ({ default: class {} }));

const call = async (headers: Record<string, string>, action = "events.list") => {
  const { handler } = await import("../netlify/functions/admin-bridge.mjs");
  return handler({ httpMethod: "POST", headers, body: JSON.stringify({ action, orbitPassword: "anything" }) });
};

describe("admin-bridge authorisation", () => {
  beforeEach(() => {
    currentUser = null;
    adminRole = false;
    insertSpy.mockClear();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.SUPABASE_PUBLISHABLE_KEY = "test-anon-key";
  });

  it("rejects a shared-password header / body outright", async () => {
    const res = await call({ "x-orbit-gate-password": "anything", "x-forwarded-for": "10.0.0.1" });
    expect(res.statusCode).toBe(403);
  });

  it("rejects an unverified account that merely uses the owner's email", async () => {
    currentUser = { id: "u1", email: "oadeagbo@gmail.com", email_confirmed_at: null };
    const res = await call({ authorization: "Bearer t", "x-forwarded-for": "10.0.0.2" });
    expect(res.statusCode).toBe(403);
  });

  it("accepts the verified owner", async () => {
    currentUser = { id: "u1", email: "oadeagbo@gmail.com", email_confirmed_at: "2026-10-04T10:00:00Z" };
    const res = await call({ authorization: "Bearer t", "x-forwarded-for": "10.0.0.3" });
    expect(res.statusCode).toBe(200);
  });

  it("accepts a user holding the admin role, and rejects one without", async () => {
    currentUser = { id: "u2", email: "tester@example.com", email_confirmed_at: "2026-10-04T10:00:00Z" };
    adminRole = true;
    expect((await call({ authorization: "Bearer t", "x-forwarded-for": "10.0.0.4" })).statusCode).toBe(200);
    adminRole = false;
    expect((await call({ authorization: "Bearer t", "x-forwarded-for": "10.0.0.5" })).statusCode).toBe(403);
  });

  it("no longer exposes the access-request actions (unknown action, nothing written)", async () => {
    currentUser = { id: "u1", email: "oadeagbo@gmail.com", email_confirmed_at: "2026-10-04T10:00:00Z" };
    for (const action of ["access.request", "access.status", "access.list", "access.decide"]) {
      const res = await call({ authorization: "Bearer t", "x-forwarded-for": "10.0.0.6" }, action);
      expect(res.statusCode).toBe(400);
    }
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
