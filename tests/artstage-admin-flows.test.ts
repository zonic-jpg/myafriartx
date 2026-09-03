import { describe, expect, it } from "vitest";
import { isOrbitAdminPassword } from "../src/lib/adminGate";
import { publicMessage } from "../src/lib/public-message";
import {
  LETTER_AUDIENCES,
  letterGreeting,
  letterTemplate,
} from "../src/lib/letter-templates";
import { emptyDraft, isDraftPreppable, draftStorageKey } from "../src/lib/batch-upload";
import { sizeText, validateSubmission } from "../src/lib/submissions";

describe("orbit admin passwords", () => {
  it("accepts the 2026 gate passwords case-insensitively", () => {
    expect(isOrbitAdminPassword("zonicGate2026a")).toBe(true);
    expect(isOrbitAdminPassword("ZONICGATE2026B")).toBe(true);
    expect(isOrbitAdminPassword("zonicStudio2026")).toBe(true);
  });

  it("rejects retired passwords", () => {
    expect(isOrbitAdminPassword("admintester1")).toBe(false);
    expect(isOrbitAdminPassword("admin123")).toBe(false);
    expect(isOrbitAdminPassword("rubbaxadmin1")).toBe(false);
  });
});

describe("batch upload drafts", () => {
  it("marks a draft preppable only when required fields are present", () => {
    const draft = emptyDraft({ id: "a", fileName: "x.jpg", imageDataUrl: "data:image/jpeg;base64,AA" });
    expect(isDraftPreppable(draft)).toBe(false);
    const ready = {
      ...draft,
      title: "Harmattan",
      widthCm: "60",
      heightCm: "90",
      yearCreated: "2024",
      countryOfOrigin: "Nigeria",
      context: "Painted during the harmattan in Enugu with morning light on the road.",
    };
    expect(isDraftPreppable(ready)).toBe(true);
  });

  it("builds a per-artist storage key", () => {
    expect(draftStorageKey("artist-1")).toContain("artist-1");
  });
});

describe("publicMessage", () => {
  it("turns a raw auth failure into a sign-in prompt", () => {
    expect(publicMessage(new Error("Unauthorized: No authorization header provided"))).toBe(
      "Your session has expired. Sign in again to continue.",
    );
  });

  it("turns an RLS denial into a permission message", () => {
    expect(publicMessage(new Error("new row violates row-level security policy"))).toBe(
      "You do not have permission to do that on this account.",
    );
  });

  it("falls back rather than leaking a stack trace", () => {
    const err = new Error("Boom\n    at handler (/var/task/server.js:12:9)");
    expect(publicMessage(err)).toBe("Something went wrong. Please try again.");
  });

  it("uses the caller's fallback for an empty error", () => {
    expect(publicMessage(null, "Could not load submissions.")).toBe("Could not load submissions.");
  });
});

describe("letter templates", () => {
  it("populates every audience with subject, cta and body", () => {
    expect(LETTER_AUDIENCES.length).toBeGreaterThanOrEqual(6);
    for (const id of LETTER_AUDIENCES) {
      const t = letterTemplate(id);
      expect(t.id).toBe(id);
      expect(t.subject("MyAfriArt").length).toBeGreaterThan(0);
      expect(t.cta.length).toBeGreaterThan(0);
      expect(t.build("MyAfriArt").join("").length).toBeGreaterThan(80);
    }
  });

  it("falls back to a complete template for an unknown id", () => {
    expect(letterTemplate("does-not-exist").id).toBe("permission");
    expect(letterTemplate(null).build("MyAfriArt").length).toBeGreaterThan(0);
  });

  it("addresses the company role when no proprietor is named", () => {
    const t = letterTemplate("permission");
    expect(letterGreeting(t, "  ", "Kata Gallery")).toBe(`The ${t.role} at Kata Gallery`);
    expect(letterGreeting(t, "Ada Obi", "Kata Gallery")).toBe("Ada Obi");
  });
});

describe("submission validation", () => {
  const complete = {
    artistName: "Ada Obi",
    submitterEmail: "ada@example.com",
    title: "Harmattan",
    medium: "oil",
    widthCm: "60",
    heightCm: "90",
    depthCm: "",
    yearCreated: "2024",
    countryOfOrigin: "Nigeria",
    priceAmount: "1200",
    priceCurrency: "USD",
    context: "Painted during the harmattan in Enugu, working from the light on the road at dawn.",
  };

  it("accepts a complete draft with an image", () => {
    expect(validateSubmission(complete, "data:image/png;base64,AAAA")).toEqual({});
  });

  it("requires an image", () => {
    expect(validateSubmission(complete, null).image).toBeTruthy();
  });

  it("requires width, height, a four-digit year and a real story", () => {
    const errors = validateSubmission(
      { ...complete, widthCm: "", yearCreated: "24", context: "Nice." },
      "data:image/png;base64,AAAA",
    );
    expect(errors.size).toBeTruthy();
    expect(errors.yearCreated).toBeTruthy();
    expect(errors.context).toBeTruthy();
  });

  it("rejects a malformed email but allows a blank one", () => {
    expect(
      validateSubmission({ ...complete, submitterEmail: "nope" }, "data:image/png;base64,AAAA")
        .submitterEmail,
    ).toBeTruthy();
    expect(
      validateSubmission({ ...complete, submitterEmail: "" }, "data:image/png;base64,AAAA")
        .submitterEmail,
    ).toBeUndefined();
  });

  it("formats size only when at least two dimensions are given", () => {
    expect(sizeText({ widthCm: "60", heightCm: "90", depthCm: "" })).toBe("60 × 90 cm");
    expect(sizeText({ widthCm: "60", heightCm: "", depthCm: "" })).toBeNull();
  });
});
