import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Emails the founding owner (via Resend) when something is waiting for approval,
 * with a one-click link to the approvals page of THIS app.
 *
 * Secrets (server env — same ones Letter Studio already uses):
 *   RESEND_API_KEY   required to actually send (absent -> soft-fail, the in-app queue still works)
 *   LETTERS_FROM     optional sender, default "MyAfriArt <partnerships@myafriart.com>"
 *   PUBLIC_APP_URL   optional base URL for the link, default https://myafriartx.netlify.app
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (already required by the server)
 *
 * The recipient is ALWAYS the founding owner, fixed server-side — callers can
 * only say what is waiting, and only about their own account.
 */
export const notifyOwnerApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind: z.enum(["signup", "admin_request"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await import("@/integrations/supabase/client.server").then((m) => m.supabaseAdmin);
    const { notifyOwnerForUser } = await import("./signup-approval.server");
    return notifyOwnerForUser(admin as never, context.userId, data.kind, {
      resendKey: process.env.RESEND_API_KEY,
      from: process.env.LETTERS_FROM,
      appUrl: process.env.PUBLIC_APP_URL,
    });
  });
