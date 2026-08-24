/**
 * PHP → ArtStage bridge.
 *
 * PHP mints a short-lived JWT (HS256, signed with PHP_BRIDGE_SECRET):
 *   payload: { sub: "<php_user_id>", email: "user@x.com", name?: "...", iat, exp }
 * and redirects the user to:
 *   /api/bridge/enter?token=<JWT>&redirect=/studio
 *
 * We verify the token, upsert a Supabase user, mint a magic-link recovery URL
 * via the admin API, and redirect the browser into Supabase's verify flow which
 * sets the session cookie and lands on the studio.
 */
import { createFileRoute } from "@tanstack/react-router";
import { jwtVerify } from "jose";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ALLOWED_REDIRECT_PATHS = new Set(["/studio", "/renders"]);

function newCorrelationId() {
  return (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8);
}

function genericError(status: number, userMessage: string, cid: string) {
  return new Response(`${userMessage} (ref: ${cid})`, { status });
}

export const Route = createFileRoute("/api/bridge/enter")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cid = newCorrelationId();
        try {
          const url = new URL(request.url);
          const token = url.searchParams.get("token");
          const redirectTo = safeRedirectPath(url.searchParams.get("redirect"));
          const secret = process.env.PHP_BRIDGE_SECRET;
          if (!secret) {
            console.error(`[bridge ${cid}] PHP_BRIDGE_SECRET not configured`);
            return genericError(500, "Sign-in is temporarily unavailable.", cid);
          }
          if (!token) return genericError(400, "Sign-in request is invalid.", cid);

          let claims: any;
          try {
            const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
              algorithms: ["HS256"],
            });
            claims = payload;
          } catch (e) {
            console.error(`[bridge ${cid}] token verification failed:`, e);
            return genericError(401, "Sign-in link is invalid or has expired.", cid);
          }

          const phpUserId = String(claims.sub ?? "");
          const email = String(claims.email ?? "");
          const displayName = (claims.name as string | undefined) ?? null;
          if (!phpUserId || !email) {
            console.error(`[bridge ${cid}] token missing sub/email`, {
              hasSub: !!phpUserId,
              hasEmail: !!email,
            });
            return genericError(400, "Sign-in request is invalid.", cid);
          }

          // Find or create the linked app user.
          let userId: string | undefined;
          const { data: existing, error: lookupErr } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("external_user_id", phpUserId)
            .maybeSingle();
          if (lookupErr) {
            console.error(`[bridge ${cid}] profile lookup error:`, lookupErr);
            return genericError(500, "Sign-in failed. Please try again.", cid);
          }
          if (existing?.id) {
            userId = existing.id;
          } else {
            const created = await supabaseAdmin.auth.admin.createUser({
              email,
              email_confirm: true,
              user_metadata: {
                display_name: displayName ?? email.split("@")[0],
                external_source: "php",
                external_user_id: phpUserId,
              },
            });
            if (created.error && !created.error.message?.includes("already")) {
              console.error(`[bridge ${cid}] provisioning error:`, created.error);
              return genericError(500, "Sign-in failed. Please try again.", cid);
            }
            if (created.data?.user) {
              userId = created.data.user.id;
              const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(
                {
                  id: userId,
                  display_name: displayName ?? email.split("@")[0],
                  external_source: "php",
                  external_user_id: phpUserId,
                },
                { onConflict: "id" },
              );
              if (upsertErr) {
                console.error(`[bridge ${cid}] profile upsert error:`, upsertErr);
                return genericError(500, "Sign-in failed. Please try again.", cid);
              }
            } else {
              console.error(`[bridge ${cid}] auth user exists but no linked profile`, {
                phpUserId,
              });
              return genericError(409, "Sign-in failed. Please contact support.", cid);
            }
          }
          if (!userId) {
            console.error(`[bridge ${cid}] could not resolve user id`);
            return genericError(500, "Sign-in failed. Please try again.", cid);
          }

          // Generate a magic link the browser can follow to set the session.
          const origin = `${url.protocol}//${url.host}`;
          const link = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo: `${origin}${redirectTo}` },
          });
          if (link.error || !link.data.properties?.action_link) {
            console.error(`[bridge ${cid}] magic link error:`, link.error);
            return genericError(500, "Sign-in failed. Please try again.", cid);
          }
          return Response.redirect(link.data.properties.action_link, 302);
        } catch (e) {
          console.error(`[bridge ${cid}] unexpected error:`, e);
          return genericError(500, "Sign-in failed. Please try again.", cid);
        }
      },
    },
  },
});

function safeRedirectPath(raw: string | null) {
  if (!raw || raw.includes("@") || raw.includes("//") || !raw.startsWith("/")) return "/studio";
  const path = raw.split("?")[0].split("#")[0];
  return ALLOWED_REDIRECT_PATHS.has(path) ? raw : "/studio";
}
