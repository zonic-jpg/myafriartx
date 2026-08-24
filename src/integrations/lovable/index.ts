// De-Lovabled: native Supabase OAuth. No @lovable.dev/cloud-auth-js dependency.
// Keeps the prior `lovable.auth.signInWithOAuth(provider, opts)` surface so
// existing callers (login.tsx) keep working unchanged.
import { supabase } from "../supabase/client";

type Provider = "google" | "apple" | "microsoft" | "lovable";
type SignInOptions = { redirect_uri?: string; extraParams?: Record<string, string> };

const mapProvider = (p: Provider): "google" | "apple" | "azure" =>
  p === "microsoft" ? "azure" : p === "lovable" ? "google" : p;

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: Provider, opts?: SignInOptions) =>
      supabase.auth.signInWithOAuth({
        provider: mapProvider(provider),
        options: { redirectTo: opts?.redirect_uri, queryParams: opts?.extraParams },
      }),
  },
};
