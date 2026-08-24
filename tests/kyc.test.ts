import { describe, expect, it } from "vitest";
import { sniffDocMime } from "../src/lib/doc-sniff";

const pad = (bytes: number[]) => new Uint8Array([...bytes, ...Array(16).fill(0)]);

describe("KYC document sniffing", () => {
  it("accepts JPEG magic bytes", () => {
    expect(sniffDocMime(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });

  it("accepts PNG magic bytes", () => {
    expect(sniffDocMime(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
  });

  it("accepts PDF magic bytes", () => {
    expect(sniffDocMime(pad([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("application/pdf");
  });

  it("rejects HTML masquerading as an image", () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script>");
    expect(sniffDocMime(html)).toBeNull();
  });

  it("rejects SVG (XSS vector)", () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">');
    expect(sniffDocMime(svg)).toBeNull();
  });

  it("rejects truncated files", () => {
    expect(sniffDocMime(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});
