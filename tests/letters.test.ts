import { describe, expect, it } from "vitest";
import { escHtml } from "../src/lib/html-escape";
import { parseCsvText } from "../src/components/admin/ArtistCsvImport";
import { LETTER_AUDIENCES, letterGreeting, letterTemplate } from "../src/lib/letter-templates";

describe("letter generation safety", () => {
  it("escapes markup, quotes and ampersands", () => {
    expect(escHtml(`<img src=x onerror="alert(1)"> & 'Co'`)).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;Co&#39;",
    );
    expect(escHtml(null)).toBe("");
    expect(escHtml(undefined)).toBe("");
    expect(escHtml(0)).toBe("0");
  });
  it("keeps unicode (accents, Yoruba tone marks, emoji) intact", () => {
    const s = "Ọláńrewájú & Àdùké Ltd — 🎨";
    expect(escHtml(s)).toBe("Ọláńrewájú &amp; Àdùké Ltd — 🎨");
  });
  it("every audience builds a non-empty letter, even for blank / hostile / very long brands", () => {
    const brands = ["", "   ", "A", "<b>x</b>", "Z".repeat(5000), "O'Brien & Sons \"Ltd\""];
    for (const id of LETTER_AUDIENCES) {
      const t = letterTemplate(id);
      for (const b of brands) {
        const paras = t.build(b);
        expect(paras.length).toBeGreaterThan(0);
        expect(paras.every((p) => p.trim().length > 0)).toBe(true);
        expect(t.subject(b).length).toBeGreaterThan(0);
      }
    }
  });
  it("unknown audience falls back to a full template; greeting never empty", () => {
    expect(letterTemplate("nope").build("X").length).toBeGreaterThan(0);
    expect(letterGreeting(letterTemplate("press"), "", "").length).toBeGreaterThan(0);
    expect(letterGreeting(letterTemplate("press"), "  ", "Acme")).toContain("Acme");
    expect(letterGreeting(letterTemplate("press"), " Mrs Eze ", "Acme")).toBe("Mrs Eze");
  });
  it("CSV import handles quoted commas, escaped quotes, BOM and CRLF", () => {
    const csv = '﻿brand,email,address\r\n"Ade & Sons, Ltd",ade@x.com,"12 Marina, Lagos"\r\n"Say ""Hi"" Studio",hi@x.com,Abuja\r\n';
    const t = parseCsvText(csv).filter((r) => r.some((c) => c.trim()));
    expect(t[0]).toEqual(["brand", "email", "address"]);
    expect(t[1]).toEqual(["Ade & Sons, Ltd", "ade@x.com", "12 Marina, Lagos"]);
    expect(t[2][0]).toBe('Say "Hi" Studio');
    expect(t).toHaveLength(3);
  });
});
