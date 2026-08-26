import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { s as supabase } from "./client-BWo_yy_6.js";
import { toast } from "sonner";
import { i as isUniformAdminPassword, r as resolveAdminGateLogin, s as saveAdminGate, a as isOwnerEmail } from "./adminTesterApproval-BSsAT6LI.js";
import "@supabase/supabase-js";
const mapProvider = (p) => p === "microsoft" ? "azure" : p === "lovable" ? "google" : p;
const lovable = {
  auth: {
    signInWithOAuth: async (provider, opts) => supabase.auth.signInWithOAuth({
      provider: mapProvider(provider),
      options: { redirectTo: opts?.redirect_uri, queryParams: opts?.extraParams }
    })
  }
};
async function getPostLoginPath() {
  const {
    data: {
      user
    }
  } = await supabase.auth.getUser();
  if (!user) return "/studio";
  const {
    data: roles,
    error
  } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  if (error) {
    console.error("[login] failed to resolve user role", error);
    return "/studio";
  }
  return roles?.some((entry) => entry.role === "admin") ? "/admin" : "/studio";
}
function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    const routeSignedInUser = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!active || !session) return;
      const destination = await getPostLoginPath();
      if (active) navigate({
        to: destination
      });
    };
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      void (async () => {
        const destination = await getPostLoginPath();
        if (active) navigate({
          to: destination
        });
      })();
    });
    void routeSignedInUser();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isUniformAdminPassword(password)) {
        const gate = resolveAdminGateLogin(email, password, "myafriartx");
        if (!gate.ok) {
          toast.error(gate.message || "Awaiting approval");
          return;
        }
        saveAdminGate(email);
        toast.success("Admin access granted");
        navigate({
          to: isOwnerEmail(email) ? "/admin#admintester-queue" : "/admin"
        });
        return;
      }
      if (mode === "signup") {
        const {
          data,
          error
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`
          }
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Account created. Check your email, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const {
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      }
      navigate({
        to: await getPostLoginPath()
      });
    } catch (err) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }
  async function signInWithGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/login`
      });
      if (result.error) throw result.error;
    } catch (err) {
      toast.error(err.message ?? "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-6", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-sm", children: [
    /* @__PURE__ */ jsx(Link, { to: "/", className: "font-display text-2xl", children: "MyAfriart" }),
    /* @__PURE__ */ jsx("h1", { className: "mt-8 font-display text-3xl", children: mode === "signin" ? "Welcome back" : "Create an account" }),
    /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: mode === "signin" ? "Sign in to keep your renders." : "Start staging rooms in seconds." }),
    /* @__PURE__ */ jsxs("button", { type: "button", onClick: signInWithGoogle, disabled: loading, className: "mt-8 flex w-full items-center justify-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50", children: [
      /* @__PURE__ */ jsxs("svg", { className: "h-5 w-5", viewBox: "0 0 24 24", children: [
        /* @__PURE__ */ jsx("path", { d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z", fill: "#4285F4" }),
        /* @__PURE__ */ jsx("path", { d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z", fill: "#34A853" }),
        /* @__PURE__ */ jsx("path", { d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z", fill: "#FBBC05" }),
        /* @__PURE__ */ jsx("path", { d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z", fill: "#EA4335" })
      ] }),
      "Sign in with Google"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 flex items-center gap-3", children: [
      /* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-border" }),
      /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground uppercase tracking-wider", children: "or" }),
      /* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-border" })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "mt-6 space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Email" }),
        /* @__PURE__ */ jsx("input", { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Password" }),
        /* @__PURE__ */ jsx("input", { type: "password", required: true, minLength: 6, value: password, onChange: (e) => setPassword(e.target.value), className: "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "submit", disabled: loading, className: "w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50", children: loading ? "…" : mode === "signin" ? "Sign in" : "Create account" })
    ] }),
    /* @__PURE__ */ jsx("button", { onClick: () => setMode(mode === "signin" ? "signup" : "signin"), className: "mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground", children: mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in" })
  ] }) });
}
export {
  LoginPage as component
};
