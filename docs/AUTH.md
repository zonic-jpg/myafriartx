# MyAfriArtX auth

Normal Supabase email + password accounts for everyone. **Keep "Confirm email" ON**
in Supabase Auth. No password is stored, seeded or hardcoded anywhere in this repo.

## Rules

1. **Owner = super admin.** `oadeagbo@gmail.com`, recognised by a *verified* email
   (`auth.users.email_confirmed_at`), never by a password. The owner can act as a
   user or an admin (the database trigger gives the verified owner the `user` and
   `admin` roles). The owner is never gated and cannot be demoted by anyone else.
2. **Testers sign up normally** with their own email. They appear under
   **Admin > Approvals** (`/admin?tab=approvals`), where the owner grants
   content-management admin with one tap ("Approve as admin" / "Make admin").
   A signed-in non-admin can also press "Request admin access" on `/admin`.
3. **Open login by default.** The owner can switch **Require approval for new
   accounts** on. New accounts are then *pending* until the owner approves them
   and picks a role (user or admin). Accounts that predate the switch are
   grandfathered; switching it off releases everyone who is pending. Everything
   fails open client-side if the database functions are not deployed yet.
4. **Only the owner allocates roles** (RLS on `user_roles` and the owner-only RPCs
   `decide_signup`, `set_member_role`, `set_require_approvals`).
5. **Owner notification.** When an account becomes pending (or asks for admin),
   the owner gets one email via Resend with a link to
   `https://<site>/admin?tab=approvals`. Signed out? `/admin` redirects to
   `/login?redirect=/admin%3Ftab%3Dapprovals` and sign-in returns there.

## Where it lives

- DB: `supabase/migrations/20261004120000_signup_approvals.sql`
- Client: `src/lib/signupApproval.ts`, `src/components/ApprovalGate.tsx`,
  `src/components/PendingApproval.tsx`, `src/components/admin/SignupApprovalsAdmin.tsx`
- Email: `src/lib/signup-approval.functions.ts` (+ `.server.ts`). Server env:
  `RESEND_API_KEY` (soft-fails if absent), optional `LETTERS_FROM`, `PUBLIC_APP_URL`.
- Admin API: `netlify/functions/admin-bridge.mjs` (admin JWT or verified owner only).
