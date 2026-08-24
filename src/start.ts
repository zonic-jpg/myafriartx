import { createStart, createMiddleware } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit.server";

import { renderErrorPage } from "./lib/error-page";

const rateLimitMiddleware = createMiddleware().server(async ({ request, next }) => {
  const path = new URL(request.url).pathname;
  if (path.startsWith("/api/")) {
    const key = rateLimitKey(request);
    if (!checkRateLimit(key)) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }
  }
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [rateLimitMiddleware, errorMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
