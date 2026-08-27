# MyAfriArtX auth — Zonic orbit standard (5 rules)

See MyYangaX `AUTH.md` for the full orbit standard.

## Rule 1 — Owner always in

`oadeagbo@gmail.com` → owner + admin immediately via admin-password gate or normal auth.

## Rule 2 — ADMINTESTER queue

Any other email + admin password → **PENDING** with awaiting-approval message.

## Rule 3 — Owner queue on login

Owner admin-password login → `/admin#admintester-queue`.

## Rule 4 — Approved = full access

Approved testers get full admin studio (upload, edit, catalogue, all features).

## Rule 5 — Owner allocates rights

Owner manages allocations, featured content, and admin permissions in `/admin`.

## Module

`src/lib/adminTesterApproval.ts` · login: `src/routes/login.tsx`
