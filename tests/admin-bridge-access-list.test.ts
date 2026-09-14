import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression test for the 2026-09-14 "approved yet pending is showing" bug.
 *
 * netlify/functions/admin-bridge.mjs's `access.list` case used to re-seed a
 * fake "tester-verify@example.com" row back to status "pending" every time
 * the queue was loaded with zero real pending entries. That meant an owner
 * could approve every real request and the very next queue load would
 * manufacture a brand new "pending" entry out of thin air — indistinguishable
 * from approvals silently failing. See the BUG FIX comment at that call site.
 *
 * This test mocks @supabase/supabase-js so it runs with no network access and
 * writes nothing to any real database — it only asserts the shape of the
 * *handler's own logic*: given zero rows from the DB, `access.list` must
 * return zero requests and must never call `.insert(...)` as a side effect
 * of a read action.
 */

type Row = Record<string, unknown>;

function makeSelectChain(rows: Row[]) {
  // Mimics the subset of the supabase-js query builder admin-bridge.mjs
  // actually calls for access.list: .from().select().eq().order().limit()
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data: rows, error: null })),
  };
  return chain;
}

const insertSpy = vi.fn(() => Promise.resolve({ data: null, error: null }));

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === "admin_access_requests") {
          const chain = makeSelectChain([]);
          chain.insert = insertSpy;
          return chain;
        }
        return makeSelectChain([]);
      }),
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null } })) },
    })),
  };
});

vi.mock("ws", () => ({ default: class {} }));

describe("admin-bridge access.list", () => {
  beforeEach(() => {
    insertSpy.mockClear();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("returns an empty queue — never fabricates a pending row — when there are zero real requests", async () => {
    const { handler } = await import("../netlify/functions/admin-bridge.mjs");

    const res = await handler({
      httpMethod: "POST",
      headers: { "x-orbit-gate-password": "zonicgate2026" },
      body: JSON.stringify({ action: "access.list" }),
    });

    expect(res.statusCode).toBe(200);
    const parsed = JSON.parse(res.body);
    expect(parsed.requests).toEqual([]);
    // The historical bug: a read action wrote a fake row back to the table.
    // A pure list must never insert anything.
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
