import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared site navigation.
 * - md and up: logo + inline links.
 * - below md: logo + a menu button that opens a slide-in sidebar with every destination,
 *   so nothing is ever cut off on a phone.
 */
export const NAV_LINKS: { to: string; label: string }[] = [
  { to: "/", label: "Discover" },
  { to: "/lounge", label: "Art Lounge" },
  { to: "/events", label: "Live events" },
  { to: "/auction", label: "Auctions" },
  { to: "/studio", label: "Stage a room" },
  { to: "/submit", label: "Submit work" },
  { to: "/notify", label: "NotifyMe" },
  { to: "/renders", label: "My renders" },
  { to: "/collateral", label: "Collateral" },
  { to: "/disputes", label: "Disputes" },
];

export function useAuthed() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => alive && setAuthed(!!data.session))
      .catch(() => alive && setAuthed(false));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return authed;
}

export function signOutAndLeave() {
  void supabase.auth.signOut().catch(() => undefined);
  window.location.href = "/login";
}

/** Slide-in sidebar used by every page (and by the catalogue page, which adds its filters to it). */
export function NavDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
}) {
  const authed = useAuthed();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-[70] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-label="Site menu"
        className={`absolute inset-y-0 left-0 flex w-[86%] max-w-xs flex-col overflow-y-auto bg-zinc-950 text-zinc-100 shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="font-display text-lg">MyAfriArt</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded px-2 py-1 text-2xl leading-none text-zinc-300 hover:text-white"
          >
            ×
          </button>
        </div>
        <nav className="flex flex-col py-2">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={onClose}
              className="px-5 py-3 text-[15px] text-zinc-200 hover:bg-white/10 hover:text-white"
              activeProps={{ className: "bg-white/10 text-white" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 p-4">
          {authed ? (
            <button
              type="button"
              onClick={signOutAndLeave}
              className="w-full rounded border border-white/20 px-4 py-2.5 text-sm text-zinc-100 hover:bg-white/10"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="block w-full rounded bg-white px-4 py-2.5 text-center text-sm font-medium text-zinc-900"
            >
              Sign in
            </Link>
          )}
        </div>
        {children}
      </aside>
    </div>
  );
}

export function MenuButton({ onClick, light = false }: { onClick: () => void; light?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open menu"
      className={`flex h-10 w-10 items-center justify-center rounded-md md:hidden ${
        light ? "text-white hover:bg-white/15" : "text-foreground hover:bg-muted"
      }`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

/**
 * Drop-in page header.
 *  tone="plain"  -> white/bordered (default)
 *  tone="brand"  -> purple-to-red gradient (artist / piece pages)
 */
export function SiteNav({
  tone = "plain",
  right,
}: {
  tone?: "plain" | "brand";
  /** optional extra controls shown on the right (e.g. notification bell) */
  right?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const authed = useAuthed();
  const brand = tone === "brand";
  const linkCls = brand ? "text-white/85 hover:text-white" : "text-muted-foreground hover:text-foreground";
  const inline = NAV_LINKS.filter((l) => ["/lounge", "/events", "/studio", "/submit"].includes(l.to));

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b ${
          brand ? "border-border bg-gradient-to-r from-purple-600 to-red-500 text-white" : "border-border bg-background"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-1">
            <MenuButton onClick={() => setOpen(true)} light={brand} />
            <Link to="/" className="truncate font-display text-lg sm:text-xl">
              MyAfriArt
            </Link>
          </div>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {inline.map((l) => (
              <Link key={l.to} to={l.to} className={linkCls}>
                {l.label}
              </Link>
            ))}
            {right}
            {authed ? (
              <button type="button" onClick={signOutAndLeave} className={linkCls}>
                Sign out
              </button>
            ) : (
              <Link to="/login" className={linkCls}>
                Sign in
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2 md:hidden">{right}</div>
        </div>
      </header>
      <NavDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
