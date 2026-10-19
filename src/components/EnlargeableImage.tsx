import { useCallback, useEffect, useState, type ImgHTMLAttributes } from "react";

type EnlargeableImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "onClick"> & {
  src: string;
  /** Picture to show in the viewer if different from the thumbnail (defaults to src). */
  fullSrc?: string;
  /** Accessible label for the open button. */
  openLabel?: string;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

/**
 * Click or tap any picture to open it full-screen, with zoom in / zoom out / reset, a large
 * close button, Esc to close and a click-to-zoom toggle, so people with poor eyesight can
 * examine a piece properly before buying or selling.
 */
export function EnlargeableImage({ src, fullSrc, openLabel, alt, className, ...imgProps }: EnlargeableImageProps) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const close = useCallback(() => {
    setOpen(false);
    setZoom(1);
  }, []);
  const zoomBy = useCallback((delta: number) => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + delta) * 100) / 100)));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "+" || e.key === "=") zoomBy(ZOOM_STEP);
      if (e.key === "-") zoomBy(-ZOOM_STEP);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, zoomBy]);

  const btn =
    "min-h-[44px] min-w-[44px] rounded-md bg-white/15 px-4 text-lg font-semibold text-white hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white";

  return (
    <>
      <img
        {...imgProps}
        src={src}
        alt={alt ?? ""}
        className={`${className ?? ""} cursor-zoom-in`}
        role="button"
        tabIndex={0}
        aria-label={openLabel ?? `Enlarge picture${alt ? `: ${alt}` : ""}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      />
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt ? `Enlarged picture: ${alt}` : "Enlarged picture"}
          className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          onClick={close}
        >
          <div className="flex items-center justify-between gap-2 p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <button type="button" className={btn} onClick={() => zoomBy(-ZOOM_STEP)} aria-label="Zoom out" disabled={zoom <= MIN_ZOOM}>
                −
              </button>
              <span className="min-w-[3.5rem] text-center text-sm text-white">{Math.round(zoom * 100)}%</span>
              <button type="button" className={btn} onClick={() => zoomBy(ZOOM_STEP)} aria-label="Zoom in" disabled={zoom >= MAX_ZOOM}>
                +
              </button>
              <button type="button" className={btn} onClick={() => setZoom(1)} aria-label="Reset zoom">
                Reset
              </button>
            </div>
            <button type="button" className={btn} onClick={close} aria-label="Close enlarged picture">
              ✕ Close
            </button>
          </div>
          <div
            className="flex-1 overflow-auto"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                zoomBy(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
              }
            }}
          >
            <div className="flex min-h-full min-w-full items-center justify-center p-2" style={{ width: `${zoom * 100}%` }}>
              <img
                src={fullSrc ?? src}
                alt={alt ?? ""}
                draggable={false}
                onClick={() => setZoom((z) => (z >= MAX_ZOOM ? 1 : Math.min(MAX_ZOOM, z + 1)))}
                className={`h-auto max-h-none w-full object-contain ${zoom >= MAX_ZOOM ? "cursor-zoom-out" : "cursor-zoom-in"}`}
                style={{ maxHeight: zoom === 1 ? "calc(100vh - 90px)" : undefined }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
