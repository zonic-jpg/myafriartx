/**
 * The founding owner / super admin. Recognised by a VERIFIED email only —
 * never by a password. Keep "Confirm email" ON in Supabase Auth so nobody can
 * register this address without owning the inbox. The database is the real
 * authority (public.is_founding_owner); this is for UI affordances.
 */
export const FOUNDING_OWNER_EMAIL = "oadeagbo@gmail.com";

export function isFoundingOwnerEmail(email: string | null | undefined): boolean {
  return String(email ?? "").trim().toLowerCase() === FOUNDING_OWNER_EMAIL;
}

type MaybeVerifiedUser = {
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
} | null | undefined;

/** Owner email AND a confirmed address (Supabase sets email_confirmed_at). */
export function isVerifiedOwner(user: MaybeVerifiedUser): boolean {
  if (!user) return false;
  return isFoundingOwnerEmail(user.email) && !!(user.email_confirmed_at || user.confirmed_at);
}
