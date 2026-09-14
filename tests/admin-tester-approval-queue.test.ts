import { describe, expect, it, vi } from "vitest";

/**
 * Regression test for the 2026-09-14 "approved yet pending is showing" bug —
 * client-side half. `listAccessRequests()` used to run every result through
 * `ensureTesterPending`, which fabricated a "tester-verify@example.com" row
 * back to status "pending" whenever the merged queue had zero real pending
 * entries. That meant even after the server-side admin-bridge.mjs fix, the
 * admin UI could still show a phantom pending approval that no one requested.
 * See the BUG FIX comment in src/lib/adminTesterApproval.ts.
 */
vi.mock("../src/lib/admin-bridge", () => ({
  BridgeUnavailableError: class BridgeUnavailableError extends Error {},
  callAdminBridge: vi.fn(() => Promise.resolve({ requests: [] })),
}));

describe("listAccessRequests", () => {
  it("returns an empty queue and never fabricates a tester-verify pending row", async () => {
    const { listAccessRequests } = await import("../src/lib/adminTesterApproval");
    const result = await listAccessRequests();
    expect(result.serverReachable).toBe(true);
    expect(result.entries).toEqual([]);
    expect(result.entries.some((e) => e.email === "tester-verify@example.com")).toBe(false);
  });
});
