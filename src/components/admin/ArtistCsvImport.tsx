import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { OUTREACH_PROFILE_STATUS, OUTREACH_CONTENT_SOURCE } from "@/lib/outreach-artists";

/**
 * Batch-load artists from a CSV file (Admin → Artists).
 * - Header names are matched loosely (name, country, city, medium, website, ...).
 * - New artists only: an artist whose name already exists is skipped, never overwritten.
 * - Imported artists become unclaimed outreach profiles (ART-OUT-###), the same kind the
 *   "Seed regional outreach" button creates, so they are handled by the existing claim flow.
 */

const ALIASES: Record<string, string[]> = {
  name: ["name", "artist", "artist name", "full name"],
  country: ["country", "nationality"],
  city: ["city", "domicile city", "location", "town"],
  medium: ["medium", "primary medium", "discipline", "category", "type"],
  website: ["website", "web", "url", "site", "link", "instagram"],
  bio: ["bio", "about", "description", "notes"],
  gender: ["gender", "sex"],
  era: ["era", "period", "generation"],
  source: ["source", "list", "origin"],
};

const TEMPLATE_HEADERS = ["name", "country", "city", "medium", "website", "bio", "gender", "era", "source"];
const TEMPLATE_ROW = ["Example Artist", "Nigeria", "Lagos", "Oil on canvas", "https://example.com", "Short biography", "female", "Contemporary", "Spring list"];

export function parseCsvText(text: string): string[][] {
  const src = String(text || "").replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === "") inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

type PreviewRow = { line: number; name: string; status: "new" | "duplicate" | "invalid"; reason?: string; payload?: Record<string, unknown> };

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function buildArtistRows(parsed: string[][], existingNames: Set<string>, fileName: string, firstCode: number): { rows: PreviewRow[]; error: string } {
  if (parsed.length < 2) return { rows: [], error: "That file has a header but no artists in it." };
  const idx: Record<string, number> = {};
  parsed[0].forEach((raw, i) => {
    const key = String(raw || "").trim().toLowerCase();
    for (const [field, names] of Object.entries(ALIASES)) {
      if (idx[field] === undefined && names.includes(key)) idx[field] = i;
    }
  });
  if (idx.name === undefined) return { rows: [], error: 'No "name" column found. Download the template and keep its first row.' };
  const seen = new Set<string>();
  let code = firstCode;
  const rows: PreviewRow[] = parsed.slice(1).map((cells, n) => {
    const get = (f: string) => (idx[f] === undefined ? "" : String(cells[idx[f]] ?? "").trim());
    const name = get("name");
    const line = n + 2;
    if (!name) return { line, name: "", status: "invalid", reason: "Missing artist name" };
    const key = norm(name);
    if (existingNames.has(key)) return { line, name, status: "duplicate", reason: "Already on MyAfriArt" };
    if (seen.has(key)) return { line, name, status: "duplicate", reason: "Repeated in this file" };
    seen.add(key);
    const website = get("website");
    const gender = get("gender").toLowerCase();
    const payload = {
      name,
      short_code: `ART-OUT-${String(code++).padStart(3, "0")}`,
      country: get("country") || null,
      domicile_city: get("city") || null,
      primary_medium: get("medium") || null,
      website: website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : null,
      bio: get("bio") || null,
      gender: ["female", "male", "non-binary"].includes(gender) ? gender : null,
      era: get("era") || null,
      outreach_source: get("source") || fileName || "csv import",
      outreach_status: "imported",
      profile_status: OUTREACH_PROFILE_STATUS,
      content_source: OUTREACH_CONTENT_SOURCE,
    };
    return { line, name, status: "new", payload };
  });
  return { rows, error: "" };
}

export function ArtistCsvImport({ onDone }: { onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [message, setMessage] = useState("");

  const downloadTemplate = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = `${TEMPLATE_HEADERS.join(",")}\n${TEMPLATE_ROW.map(esc).join(",")}\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "myafriart-artists-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const readFile = async (file: File) => {
    setMessage("");
    setPreview(null);
    setBusy(true);
    try {
      const parsed = parseCsvText(await file.text());
      const { data, error } = await supabase.from("artists").select("name, short_code").limit(10000);
      if (error) throw new Error(error.message);
      const existing = new Set((data ?? []).map((r: { name: string }) => norm(r.name)));
      let max = 0;
      for (const r of (data ?? []) as { short_code: string | null }[]) {
        const m = /^ART-OUT-(\d+)$/.exec(r.short_code ?? "");
        if (m) max = Math.max(max, Number(m[1]));
      }
      const built = buildArtistRows(parsed, existing, file.name, max + 1);
      if (built.error) {
        setMessage(built.error);
        return;
      }
      setFileName(file.name);
      setPreview(built.rows);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "We could not read that file. Please check it is a CSV.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    const fresh = preview.filter((r) => r.status === "new");
    if (!fresh.length) {
      setMessage("Nothing new to import.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      let inserted = 0;
      for (let i = 0; i < fresh.length; i += 100) {
        const chunk = fresh.slice(i, i + 100).map((r) => r.payload);
        const { data, error } = await supabase.from("artists").insert(chunk as never).select("id");
        if (error) throw new Error(error.message);
        inserted += (data ?? []).length;
      }
      const skipped = preview.length - fresh.length;
      setMessage(`Imported ${inserted} artist${inserted === 1 ? "" : "s"} as unclaimed outreach profiles.${skipped ? ` ${skipped} row${skipped === 1 ? "" : "s"} skipped.` : ""}`);
      toast.success(`Imported ${inserted} artists`);
      setPreview(null);
      onDone();
    } catch (e) {
      setMessage(`Import stopped: ${e instanceof Error ? e.message : "unknown error"}. Nothing after the failing batch was saved.`);
    } finally {
      setBusy(false);
    }
  };

  const fresh = preview?.filter((r) => r.status === "new").length ?? 0;
  const dup = preview?.filter((r) => r.status === "duplicate").length ?? 0;
  const bad = preview?.filter((r) => r.status === "invalid").length ?? 0;

  return (
    <div className="mb-4 rounded-md border border-border p-3">
      <p className="text-sm font-medium">Import artists from a CSV file</p>
      <p className="mb-2 text-xs text-muted-foreground">
        Columns: name (required), country, city, medium, website, bio, gender, era, source. Artists that already exist are skipped, never overwritten.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && void readFile(e.target.files[0])} />
        <button type="button" onClick={downloadTemplate} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Download template
        </button>
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? "Working…" : "Choose CSV file"}
        </button>
      </div>
      {message ? <p className="mt-2 text-sm" role="status">{message}</p> : null}
      {preview ? (
        <div className="mt-3">
          <p className="text-sm">
            <b>{fileName}</b>: {fresh} new · {dup} already exist or repeated · {bad} problems
          </p>
          <div className="max-h-56 overflow-auto rounded border border-border text-xs">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="p-1">Line</th>
                  <th className="p-1">Artist</th>
                  <th className="p-1">Result</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.line}>
                    <td className="p-1">{r.line}</td>
                    <td className="p-1">{r.name || "—"}</td>
                    <td className="p-1">{r.status === "new" ? "Will import" : r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy || !fresh} onClick={() => void confirmImport()} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-60">
              {busy ? "Importing…" : `Import ${fresh} artist${fresh === 1 ? "" : "s"}`}
            </button>
            <button type="button" disabled={busy} onClick={() => setPreview(null)} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
