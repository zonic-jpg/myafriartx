import { useCallback, useRef, useState } from "react";
import { ImageUp, RefreshCw } from "lucide-react";

/**
 * Downscale in the browser so a phone photo never becomes a multi-megabyte
 * payload. Never throws — falls back to the raw file so an upload always works.
 */
export async function fileToDownscaledDataUrl(file: File, maxEdge = 1600, quality = 0.85): Promise<string> {
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
