import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { googleAuthEnabled, lovable } from "@/integrations/lovable";
import {
  isUniformAdminPassword,
  saveAdminGate,
  isOwnerEmail,
  clearAdminGate,
  adminGateActive,
} from "@/lib/adminGate";
import { resolveAdminGateLogin } from "@/lib/adminTesterApproval";
import { PasswordRecovery } from "@/components/PasswordRecovery";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — MyAfriart" }] }),
  component: LoginPage,
});

type PostLoginPath = "/admin" | "/studio";

async function getPostLoginPath(): Promise<PostLoginPath> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/studio";

  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) {
    console.error("[login] failed to resolve user role", error);
    return "/studio";
  }

  return roles?.some((entry) => entry.role === "admin") ? "/admin" : "/studio";
}

function friendlyAuthError(message: string | undefined): string {
  const msg = String(message ?? "");
  if (/email not confirmed/i.test(msg)) {
    return "Check your inbox to confirm your email, then sign in. You can also try signing up again if the link expired.";
  }
  if (/invalid login credentials/i.test(msg)) {
    return "Wrong email or password. Try again, or create an account.";
  }
  if (/user already registered/i.test(msg)) {
    return "That email already has an account — sign in instead.";
  }
  return msg || "Authentication failed";
}

/**
 * Throwaway QA identities (alice@reviewer.demo and friends) must never be able to
 * hold this site hostage: a stale session or a browser-manager autofill for one of
 * them is discarded instead of being treated as a real sign-in.
 */
const DISPOSABLE_IDENTITY = /@(reviewer|demo|example|test)\.|@(reviewer|demo|localhost)$|\.demo$/i;

function isDisposableIdentity(email: string | null | undefined): boolean {
  return DISPOSABLE_IDENTITY.test(String(email ?? "").trim().toLowerCase());
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const typedRef = useRef(false);

  // Password managers write straight into the DOM after hydration, so React state
  // alone cannot keep the form empty. Two guards, both keyed off real keyboard
  // intent so genuine typing (including mobile IMEs) is never fought:
  //   1. for the first couple of seconds, drop any value the user did not type;
  //   2. at any time, drop a throwaway QA identity the user did not type.
  // Native listeners only: React's synthetic onBeforeInput also fires for plain
  // `input` events, which is exactly what autofill produces.
  useEffect(() => {
    const fields = [emailRef.current, passwordRef.current].filter(
      (el): el is HTMLInputElement => !!el,
    );
    const markIntent = () => {
      typedRef.current = true;
    };
    const onBeforeInput = (event: Event) => {
      // Autofill arrives as `insertReplacementText`; real editing does not.
      if ((event as InputEvent).inputType === "insertReplacementText") return;
      markIntent();
    };

    fields.forEach((el) => {
      el.addEventListener("keydown", markIntent);
      el.addEventListener("paste", markIntent);
      el.addEventListener("beforeinput", onBeforeInput);
    });
    return () => {
      fields.forEach((el) => {
        el.removeEventListener("keydown", markIntent);
        el.removeEventListener("paste", markIntent);
        el.removeEventListener("beforeinput", onBeforeInput);
      });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const clearFields = () => {
      if (emailRef.current) emailRef.current.value = "";
      if (passwordRef.current) passwordRef.current.value = "";
      setEmail("");
      setPassword("");
    };

    const scrub = () => {
      if (cancelled || typedRef.current) return;
      if (emailRef.current?.value || passwordRef.current?.value) clearFields();
    };

    const dropDisposableAutofill = () => {
      if (cancelled || typedRef.current) return;
      if (isDisposableIdentity(emailRef.current?.value)) clearFields();
    };

    const timers = [0, 120, 400, 900, 1600].map((delay) => window.setTimeout(scrub, delay));
    const watchdog = window.setInterval(dropDisposableAutofill, 250);

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(watchdog);
    };
  }, []);

  useEffect(() => {
    // Soft owner/admin gate is the session of record — never treat missing JWT as logged out.
    if (adminGateActive()) {
      window.location.replace("/admin");
      return;
    }

    let active = true;

    const resolveSession = async (session: { user?: { email?: string | null } } | null) => {
      if (!session) return;
      if (isDisposableIdentity(session.user?.email)) {
        // Scrub alice/demo JWT only — do NOT clearAdminGate (owner soft session must survive).
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        return;
      }
      if (adminGateActive()) {
        if (active) window.location.replace("/admin");
        return;
      }
      const destination = await getPostLoginPath();
      if (active) navigate({ to: destination });
    };

    const routeSignedInUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      await resolveSession(session);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      void resolveSession(session);
    });

    void routeSignedInUser();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  async function resetSignInState() {
    typedRef.current = false;
    setEmail("");
    setPassword("");
    if (emailRef.current) emailRef.current.value = "";
    if (passwordRef.current) passwordRef.current.value = "";
    clearAdminGate();
    try {
      await supabase.auth.signOut();
    } catch {
      /* already signed out */
    }
    toast.success("Sign-in reset. The form is empty and any saved session is cleared.");
    emailRef.current?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const identity = String(email ?? "").trim();
      if (isDisposableIdentity(identity)) {
        toast.error("That demo identity cannot sign in here. Use your real email.");
        await resetSignInState();
        return;
      }
      // Owner/admin passwords never go to Supabase (avoids "invalid credentials").
      if (isUniformAdminPassword(password)) {
        const gate = resolveAdminGateLogin(identity, password, "myafriartx");
        if (!gate.ok) {
          toast.error(gate.message || "Awaiting approval");
          return;
        }
        saveAdminGate(identity);
        // Drop any stale Supabase JWT (alice demo, etc.) without touching the soft gate we just saved.
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        toast.success(
          isOwnerEmail(identity) ? "Owner access granted" : "Admin access granted",
        );
        // Hard navigation so hash queue works (router `to` with # throws and looked like login failed).
        window.location.assign(isOwnerEmail(identity) ? "/admin#admintester-queue" : "/admin");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success(
            "Account created. If email confirmation is on, check your inbox — then sign in. Otherwise you’re ready.",
          );
          setMode("signin");
          return;
        }
        toast.success("Welcome — you’re signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: await getPostLoginPath() });
    } catch (err: any) {
      toast.error(friendlyAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    if (!googleAuthEnabled) {
      toast.error("Google sign-in is not configured for this site.");
      return;
    }
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/login`,
      });
      if (result.error) throw result.error;
    } catch (err: any) {
      toast.error(err.message ?? "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      id="root"
      data-auth-version="myafriartx-auth-2"
      className="flex min-h-screen items-center justify-center bg-background px-6"
    >
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display text-2xl">
          MyAfriart
        </Link>
        <h1 className="mt-8 font-display text-3xl">
          {mode === "signin" ? "Welcome back" : "Create an account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in with email to keep your renders."
            : "Email and password — start staging rooms in seconds."}
        </p>

        {googleAuthEnabled && (
          <>
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={loading}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form
          onSubmit={submit}
          autoComplete="off"
          className={googleAuthEnabled ? "mt-6 space-y-4" : "mt-8 space-y-4"}
        >
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
            <input
              ref={emailRef}
              type="text"
              name="afriart-identity"
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              inputMode="email"
              required
              value={email}
              onChange={(e) => {
                typedRef.current = true;
                setEmail(e.target.value);
              }}
              placeholder="oadeagbo@gmail.com"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <div className="relative mt-1">
              <input
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                name="afriart-secret"
                required
                minLength={6}
                value={password}
                onChange={(e) => {
                  typedRef.current = true;
                  setPassword(e.target.value);
                }}
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === "signin" && (
              <a
                href="#forgot"
                className="mt-2 block text-center text-xs text-primary underline-offset-2 hover:underline"
              >
                Forgot password?
              </a>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <PasswordRecovery brand="MyAfriArt" />

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>

        <button
          type="button"
          onClick={() => void resetSignInState()}
          className="mt-2 w-full text-center text-xs text-muted-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
        >
          Not you? Clear the form and any saved sign-in
        </button>
      </div>
    </div>
  );
}
