import { useCallback, useRef, useState } from "react";
import { ImageUp, RefreshCw } from "lucide-react";

/**
 * Downscale in the browser so a phone photo never becomes a multi-megabyte
 * payload. Never throws — falls back to the raw file so an upload always works.
 */
export async function fileToDownscaledDataUrl(
  file: File,
  maxEdge = 1600,
  quality = 0.85,
): Promise<string> {
  const readRaw = () =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  try {
    let width: number;
    let height: number;
    let source: CanvasImageSource;
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as any);
      width = bitmap.width;
      height = bitmap.height;
      source = bitmap;
    } catch {
      const dataUrl = await readRaw();
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
      });
      width = img.naturalWidth;
      height = img.naturalHeight;
      source = img;
    }

    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return readRaw();
    ctx.drawImage(source, 0, 0, w, h);
    if ("close" in source && typeof (source as any).close === "function") (source as any).close();
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return readRaw();
  }
}

/**
 * The hosting platform rejects any request body of about 6 MB or more (HTTP 413)
 * before our code runs, and base64 adds a third. So anything sent through a
 * server function has to stay under this many data-URL characters.
 */
export const MAX_UPLOAD_DATA_URL_CHARS = 5_400_000;
/** Largest raw file that still fits once base64-encoded (4 MB -> ~5.6 MB is too close, so 3.9 MB). */
const MAX_RAW_PASSTHROUGH = Math.floor((MAX_UPLOAD_DATA_URL_CHARS * 3) / 4) - 64 * 1024;

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("Could not read that file."));
    r.readAsDataURL(file);
  });

/**
 * Re-encode an image as JPEG, stepping the size down until it fits the request
 * budget. A 48-megapixel phone photo lands on the first or second step.
 */
async function jpegDataUrlWithinBudget(
  file: File,
  firstEdge: number,
  firstQuality: number,
): Promise<string> {
  const steps: Array<[number, number]> = [
    [firstEdge, firstQuality],
    [Math.min(firstEdge, 2600), 0.86],
    [Math.min(firstEdge, 2200), 0.84],
    [Math.min(firstEdge, 1800), 0.82],
    [1400, 0.8],
  ];
  let last = "";
  for (const [edge, quality] of steps) {
    last = await fileToDownscaledDataUrl(file, edge, quality);
    if (!last.startsWith("data:image/jpeg")) break; // the browser could not decode it
    if (last.length <= MAX_UPLOAD_DATA_URL_CHARS) return last;
  }
  if (!last.startsWith("data:image/jpeg")) {
    throw new Error(
      "This image format can't be read by your browser. Please export it as JPG, PNG or WebP and try again.",
    );
  }
  throw new Error("This image is too large to upload. Please choose a smaller one.");
}

const jpgName = (name: string) => `${(name.replace(/\.[^.]+$/, "") || "image").slice(0, 120)}.jpg`;

/**
 * Prepare an image for the admin upload endpoint (JPG/PNG/WEBP).
 * Normal-sized JPG/PNG/WEBP files go up untouched (full artwork quality). Anything
 * else — a large phone photo, a HEIC from an iPhone, an odd MIME type — is converted
 * to a high-quality JPEG in the browser first, sized to fit the request limit, and
 * the filename is rewritten to `.jpg` so the server's "content must match
 * extension" check stays satisfied.
 */
export async function prepareImageForUpload(
  file: File,
): Promise<{ base64: string; filename: string }> {
  const okType = /^image\/(jpeg|png|webp)$/.test(file.type);
  if (okType && file.size <= MAX_RAW_PASSTHROUGH) {
    return { base64: await readAsDataUrl(file), filename: file.name };
  }
  const base64 = await jpegDataUrlWithinBudget(file, 3200, 0.9);
  return { base64, filename: jpgName(file.name) };
}

/**
 * Prepare an ID document (photo or PDF) for the verification endpoint. Photos
 * straight from a phone camera are resized so they always fit; a PDF cannot be
 * shrunk here, so an oversized one gets a clear message instead of a failed send.
 */
export async function prepareDocumentForUpload(
  file: File,
): Promise<{ base64: string; filename: string }> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (isPdf) {
    if (file.size > MAX_RAW_PASSTHROUGH) {
      throw new Error(
        "That PDF is over 3.9 MB. Please upload a smaller PDF, or a photo of the document instead.",
      );
    }
    return { base64: await readAsDataUrl(file), filename: file.name };
  }
  const okType = /^image\/(jpeg|png|webp)$/.test(file.type);
  if (okType && file.size <= MAX_RAW_PASSTHROUGH) {
    return { base64: await readAsDataUrl(file), filename: file.name };
  }
  const base64 = await jpegDataUrlWithinBudget(file, 2600, 0.86);
  return { base64, filename: jpgName(file.name) };
}

/**
 * Prepare a photo for a direct Storage upload. Small web-ready files go up
 * untouched; large phone photos and unusual formats are resized to a JPEG so the
 * upload is quick on mobile data and never hits the bucket's size limit.
 */
export async function fileToUploadBlob(
  file: File,
  maxEdge = 2200,
  quality = 0.86,
): Promise<{ blob: Blob; ext: string; contentType: string }> {
  const okType = /^image\/(jpeg|png|webp|gif)$/.test(file.type);
  if (okType && file.size <= 2 * 1024 * 1024) {
    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "jpg";
    return { blob: file, ext, contentType: file.type };
  }
  const dataUrl = await fileToDownscaledDataUrl(file, maxEdge, quality);
  if (!dataUrl.startsWith("data:image/jpeg")) {
    // Could not be decoded here: send the original and let Storage decide.
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
    return { blob: file, ext, contentType: file.type || "image/jpeg" };
  }
  const bin = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes], { type: "image/jpeg" }), ext: "jpg", contentType: "image/jpeg" };
}

type Props = {
  value: string | null;
  onSelect: (file: File) => void;
  /** Keeps the box the same height empty or filled, so nothing shifts. */
  aspect?: string;
  title?: string;
  hint?: string;
  disabled?: boolean;
  busy?: boolean;
};

export function ImageDropzone({
  value,
  onSelect,
  aspect = "aspect-[4/3]",
  title = "Drag an image here, or click to choose",
  hint = "JPG, PNG or WebP · up to 10 MB",
  disabled = false,
  busy = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = useCallback(
    (files: FileList | null) => {
      const file = [...(files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) onSelect(file);
    },
    [onSelect],
  );

  return (
    <div
      className={`group relative w-full overflow-hidden rounded-xl border-2 border-dashed transition-colors ${aspect} ${
        dragging ? "border-primary bg-primary/5" : "border-border bg-muted/40"
      } ${disabled ? "opacity-60" : "cursor-pointer hover:border-primary/60 hover:bg-accent"}`}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-label={title}
    >
      {value ? (
        <>
          <img src={value} alt="Selected" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            <span>Image ready</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Replace
            </span>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <ImageUp className="h-8 w-8 text-primary" aria-hidden />
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
      )}

      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          pick(e.target.files);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
