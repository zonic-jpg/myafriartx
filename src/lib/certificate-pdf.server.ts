import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFImage } from "pdf-lib";

/**
 * Renders one artist certificate. The same record can be drawn in any of three designs; the serial
 * number and signature never change with the design. The sale price is not an input here: this file
 * never receives it, so it cannot print it.
 */
export type CertData = {
  serial: string; title: string; medium?: string | null; year?: string | null; dimensions?: string | null;
  edition?: string | null; brand_name: string; logo_url?: string | null; image_url?: string | null;
  design: string; issued_at: string; sig_prefix: string; signature_ok: boolean;
};

const DISCLAIMER =
  "This certificate records the artist's attestation, issued through MyAfriArt. It does not guarantee authenticity, value or title, and does not transfer copyright.";

async function fetchImage(pdf: PDFDocument, url?: string | null): Promise<PDFImage | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length > 4_000_000) return null;
    if (buf[0] === 0x89 && buf[1] === 0x50) return await pdf.embedPng(buf);
    if (buf[0] === 0xff && buf[1] === 0xd8) return await pdf.embedJpg(buf);
    return null; // webp and others are skipped rather than failing the certificate
  } catch {
    return null;
  }
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

const safe = (s: string) => s.replace(/[^\x20-\x7E -ÿ]/g, "?"); // standard fonts are Latin-1 only

export async function renderCertificatePdf(c: CertData, verifyUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const W = 595, H = 842;
  const page = pdf.addPage([W, H]);
  const design = ["classic", "modern", "heritage"].includes(c.design) ? c.design : "classic";
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifB = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const body = design === "modern" ? sans : serif;
  const head = design === "modern" ? sansB : serifB;
  const ink = rgb(0.12, 0.12, 0.12);
  const muted = rgb(0.38, 0.38, 0.38);
  const accent = design === "classic" ? rgb(0.65, 0.5, 0.15) : design === "modern" ? rgb(0.1, 0.32, 0.45) : rgb(0.66, 0.29, 0.14);

  if (design === "classic") {
    page.drawRectangle({ x: 28, y: 28, width: W - 56, height: H - 56, borderColor: accent, borderWidth: 2.5 });
    page.drawRectangle({ x: 38, y: 38, width: W - 76, height: H - 76, borderColor: accent, borderWidth: 0.8 });
  } else if (design === "modern") {
    page.drawRectangle({ x: 0, y: H - 18, width: W, height: 18, color: accent });
    page.drawRectangle({ x: 0, y: 0, width: W, height: 10, color: accent });
    page.drawRectangle({ x: 40, y: 60, width: 4, height: H - 140, color: accent });
  } else {
    page.drawRectangle({ x: 28, y: 28, width: W - 56, height: H - 56, borderColor: accent, borderWidth: 3 });
    for (let x = 52; x < W - 52; x += 22) {
      for (const y of [H - 54, 46]) {
        page.drawRectangle({ x, y, width: 8, height: 8, color: accent, rotate: degrees(45) });
      }
    }
  }

  const left = design === "modern";
  const cx = (text: string, f: PDFFont, size: number) => (left ? 64 : (W - f.widthOfTextAtSize(text, size)) / 2);
  const put = (text: string, y: number, f: PDFFont, size: number, color = ink) =>
    page.drawText(safe(text), { x: cx(safe(text), f, size), y, size, font: f, color });

  let y = H - 90;
  const logo = await fetchImage(pdf, c.logo_url);
  if (logo) {
    const s = Math.min(70 / logo.height, 160 / logo.width);
    page.drawImage(logo, { x: left ? 64 : (W - logo.width * s) / 2, y: y - logo.height * s + 20, width: logo.width * s, height: logo.height * s });
    y -= logo.height * s + 6;
  }
  put(c.brand_name.toUpperCase(), y, head, 20, accent); y -= 26;
  put("CERTIFICATE OF AUTHENTICITY", y, head, 14); y -= 30;

  const work = await fetchImage(pdf, c.image_url);
  if (work) {
    const s = Math.min(210 / work.height, 300 / work.width);
    const w = work.width * s, h = work.height * s;
    page.drawImage(work, { x: left ? 64 : (W - w) / 2, y: y - h, width: w, height: h });
    y -= h + 22;
  }
  put(c.title, y, head, 17); y -= 24;
  const rows: [string, string | null | undefined][] = [
    ["Medium", c.medium], ["Year", c.year], ["Dimensions", c.dimensions], ["Edition", c.edition],
    ["Issued", new Date(c.issued_at).toISOString().slice(0, 10)],
  ];
  for (const [k, v] of rows) {
    if (!v) continue;
    put(`${k}: ${v}`, y, body, 11.5, muted); y -= 17;
  }
  y -= 8;
  put(`Serial number  ${c.serial}`, y, sansB, 12.5, ink); y -= 16;
  put(`Record signature  ${c.sig_prefix}`, y, sans, 8.5, muted);

  try {
    // @ts-expect-error qrcode ships no type declarations; only toBuffer is used
    const QR = (await import("qrcode")).default;
    const png: Buffer = await QR.toBuffer(verifyUrl, { margin: 1, width: 220, errorCorrectionLevel: "M" });
    const qr = await pdf.embedPng(new Uint8Array(png));
    page.drawImage(qr, { x: left ? 64 : W / 2 - 40, y: 118, width: 80, height: 80 });
  } catch {
    /* the printed link below still works without the QR */
  }
  put("Scan or visit to verify:", 104, sans, 8.5, muted);
  put(verifyUrl, 92, sans, 8.5, accent);
  wrap(DISCLAIMER, sans, 8, W - 150).forEach((ln, i) => put(ln, 70 - i * 10.5, sans, 8, muted));

  return await pdf.save();
}
