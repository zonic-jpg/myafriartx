/**
 * Admin batch upload — pick one artist, drop many images, prep inline, submit prepped only.
 * Drafts persist per artist in localStorage; submission uses /api/admin-bridge.
 */
import { SUBMISSION_CURRENCIES, SUBMISSION_MEDIA, sizeText } from "@/lib/submissions";
import { callAdminBridge } from "@/lib/admin-bridge";
import { publicMessage } from "@/lib/public-message";

export { SUBMISSION_CURRENCIES, SUBMISSION_MEDIA };

export type BatchItemStatus =
  | "unprepped"
  | "prepped"
  | "uploading"
  | "uploaded"
  | "submitted"
  | "approved"
  | "rejected"
  | "failed";

export type BatchDraft = {
  id: string;
  fileName: string;
  imageDataUrl: string;
  title: string;
  medium: string;
  widthCm: string;
  heightCm: string;
  depthCm: string;
  yearCreated: string;
  countryOfOrigin: string;
  priceAmount: string;
  priceCurrency: string;
  context: string;
  status: BatchItemStatus;
  statusAt: string | null;
  statusDetail: string | null;
  submissionId: string | null;
  selected: boolean;
};

const STORAGE_PREFIX = "myafriart_batch_drafts_v1_";

export function draftStorageKey(artistId: string) {
  return `${STORAGE_PREFIX}${artistId}`;
}

export function loadDrafts(artistId: string): BatchDraft[] {
  if (!artistId) return [];
  try {
    const raw = localStorage.getItem(draftStorageKey(artistId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BatchDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDrafts(artistId: string, drafts: BatchDraft[]) {
  if (!artistId) return;
  try {
    localStorage.setItem(draftStorageKey(artistId), JSON.stringify(drafts));
  } catch {
    /* quota / private mode */
  }
}

const numeric = (value: string) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export function isDraftPreppable(draft: BatchDraft): boolean {
  return (
    !!draft.title.trim() &&
    !!numeric(draft.widthCm) &&
    !!numeric(draft.heightCm) &&
    /^\d{4}$/.test(String(draft.yearCreated || "").trim()) &&
    !!draft.countryOfOrigin.trim() &&
    draft.context.trim().length >= 20 &&
    (!draft.priceAmount.trim() || numeric(draft.priceAmount) !== null)
  );
}

export function emptyDraft(partial: Pick<BatchDraft, "id" | "fileName" | "imageDataUrl">): BatchDraft {
  return {
    ...partial,
    title: "",
    medium: "oil",
    widthCm: "",
    heightCm: "",
    depthCm: "",
    yearCreated: "",
    countryOfOrigin: "",
    priceAmount: "",
    priceCurrency: "USD",
    context: "",
    status: "unprepped",
    statusAt: null,
    statusDetail: null,
    submissionId: null,
    selected: false,
  };
}

export function statusLabel(status: BatchItemStatus): string {
  switch (status) {
    case "unprepped":
      return "Unprepped";
    case "prepped":
      return "Prepped";
    case "uploading":
      return "Uploading…";
    case "uploaded":
      return "Uploaded";
    case "submitted":
      return "Submitted";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function statusTone(status: BatchItemStatus): "neutral" | "ready" | "progress" | "ok" | "bad" {
  if (status === "prepped") return "ready";
  if (status === "uploading" || status === "uploaded") return "progress";
  if (status === "submitted") return "progress";
  if (status === "approved") return "ok";
  if (status === "rejected" || status === "failed") return "bad";
  return "neutral";
}

export type BatchSubmitPayload = {
  artistId: string;
  artistName: string;
  items: Array<{
    clientId: string;
    title: string;
    medium: string;
    widthCm: string;
    heightCm: string;
    depthCm: string;
    yearCreated: string;
    countryOfOrigin: string;
    priceAmount: string;
    priceCurrency: string;
    context: string;
    imageDataUrl: string;
  }>;
};

export type BatchSubmitResult = {
  clientId: string;
  ok: boolean;
  submissionId?: string;
  error?: string;
};

export async function submitPreppedBatch(payload: BatchSubmitPayload): Promise<BatchSubmitResult[]> {
  try {
    const res = await callAdminBridge<{ results: BatchSubmitResult[] }>("batch.submit", payload);
    return res.results ?? [];
  } catch (e) {
    throw new Error(publicMessage(e, "Batch upload could not reach the server."));
  }
}

export function formatSize(draft: Pick<BatchDraft, "widthCm" | "heightCm" | "depthCm">): string | null {
  return sizeText(draft);
}
