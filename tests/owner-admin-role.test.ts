import { describe, expect, it, vi, beforeEach } from "vitest";

let authUser: { email: string; email_confirmed_at: string | null } = { email: "x@y.z", email_confirmed_at: null };
let hasRow = false;
const inserted: unknown[] = [];

vi.mock("../src/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    auth: { admin: { getUserById: async () => ({ data: { user: authUser } }) } },
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: hasRow ? { id: 1 } : null, error: null }) }) }) }),
      insert: async (row: unknown) => { inserted.push(row); return { error: null }; },
    }),
  },
}));

import { ensureOwnerAdminRole, assertAdmin } from "../src/lib/auth-helpers.server";

beforeEach(() => { inserted.length = 0; hasRow = false; });

describe("owner admin self-provisioning", () => {
  it("grants admin to the verified owner", async () => {
    authUser = { email: "oadeagbo@gmail.com", email_confirmed_at: "2026-10-04T10:00:00Z" };
    expect(await ensureOwnerAdminRole("u1")).toBe(true);
    expect(inserted).toEqual([{ user_id: "u1", role: "admin" }]);
    await expect(assertAdmin("u1")).resolves.toBeUndefined();
  });
  it("never grants to the owner email when unverified", async () => {
    authUser = { email: "oadeagbo@gmail.com", email_confirmed_at: null };
    expect(await ensureOwnerAdminRole("u1")).toBe(false);
    expect(inserted).toEqual([]);
    await expect(assertAdmin("u1")).rejects.toThrow(/Forbidden/);
  });
  it("never grants to anyone else", async () => {
    authUser = { email: "tester@example.com", email_confirmed_at: "2026-10-04T10:00:00Z" };
    expect(await ensureOwnerAdminRole("u2")).toBe(false);
    expect(inserted).toEqual([]);
  });
});
