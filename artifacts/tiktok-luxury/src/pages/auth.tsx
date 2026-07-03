import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, LogIn, UserPlus, KeyRound, CheckCircle, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { signInSchema, signUpSchema, newPasswordSchema, emailSchema, firstIssueMessage } from "@/lib/validation";

type Tab = "login" | "signup" | "reset" | "newpass";

function InputField({
  label, type = "text", value, onChange, placeholder, autoComplete,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-black/60 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition pr-10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function SubmitButton({
  loading, icon: Icon, label, loadingLabel,
}: {
  loading: boolean; icon: typeof LogIn; label: string; loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={cn(
        "w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border font-semibold text-sm tracking-widest uppercase transition duration-300",
        loading
          ? "bg-primary/5 border-primary/20 text-primary/40 cursor-not-allowed"
          : "bg-primary/10 hover:bg-primary/20 border-primary/30 hover:border-primary/60 text-primary"
      )}
    >
      {loading ? (
        <><Loader2 className="h-4 w-4 animate-spin" />{loadingLabel}</>
      ) : (
        <><Icon className="h-4 w-4" />{label}</>
      )}
    </button>
  );
}

// Dedicated auth routes (Module 1) all render this same page — the path
// only selects which tab starts active. The canonical /login route (used
// for Supabase email redirects) always starts on "login".
function initialTabFromPath(path: string): Tab {
  if (path === "/auth/register") return "signup";
  if (path === "/auth/forgot-password") return "reset";
  return "login";
}

export default function AuthPage() {
  const { user, loading: authLoading, signIn, signUp, resetPassword, setNewPassword } = useAuth();
  const [location, navigate] = useLocation();
  const [tab, setTab]               = useState<Tab>(() => initialTabFromPath(location));
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);

  // Redirect if already authenticated (but not during a recovery session)
  useEffect(() => {
    if (!authLoading && user && tab !== "newpass") navigate("/command");
  }, [user, authLoading, navigate, tab]);

  // Detect Supabase email-link callbacks in the URL hash.
  // Supabase appends #access_token=...&type=recovery (or type=signup) after
  // the user clicks the email link. detectSessionInUrl processes the token,
  // then onAuthStateChange fires — but we also need to switch the UI.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const type   = params.get("type");

    if (type === "recovery") {
      // Clear the hash so a page refresh doesn't re-trigger this
      history.replaceState(null, "", window.location.pathname + window.location.search);
      setTab("newpass");
      setError(null);
      setSuccess(null);
    } else if (type === "signup") {
      // Email confirmed — supabase detectSessionInUrl already logs them in
      history.replaceState(null, "", window.location.pathname + window.location.search);
      setSuccess("Email confirmed! You are now signed in.");
      setTimeout(() => navigate("/command"), 1500);
    }
  }, [navigate]);

  // Also listen for PASSWORD_RECOVERY auth event as a belt-and-suspenders check
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setTab("newpass");
        setError(null);
        setSuccess(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Reset form state when switching tabs manually
  useEffect(() => {
    setError(null);
    setSuccess(null);
    setPassword("");
    setConfirmPass("");
  }, [tab]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) { setError(firstIssueMessage(parsed)); return; }
    setSubmitting(true);
    const err = await signIn(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (err) { setError(err); return; }
    navigate("/command");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = signUpSchema.safeParse({ email, password, confirmPassword: confirmPass });
    if (!parsed.success) { setError(firstIssueMessage(parsed)); return; }
    setSubmitting(true);
    const err = await signUp(parsed.data.email, parsed.data.password);
    setSubmitting(false);
    if (err) { setError(err); return; }
    setSuccess("Check your email to confirm your account, then sign in.");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setError(firstIssueMessage(parsed)); return; }
    setSubmitting(true);
    const err = await resetPassword(parsed.data);
    setSubmitting(false);
    if (err) { setError(err); return; }
    setSuccess("Password reset link sent. Check your inbox.");
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = newPasswordSchema.safeParse({ password, confirmPassword: confirmPass });
    if (!parsed.success) { setError(firstIssueMessage(parsed)); return; }
    setSubmitting(true);
    const err = await setNewPassword(parsed.data.password);
    setSubmitting(false);
    if (err) { setError(err); return; }
    setSuccess("Password updated. Redirecting…");
    setTimeout(() => navigate("/command"), 1500);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const visibleTabs: { id: Tab; icon: typeof LogIn; label: string }[] = [
    { id: "login",  icon: LogIn,    label: "Sign In"  },
    { id: "signup", icon: UserPlus, label: "Create Account" },
    { id: "reset",  icon: KeyRound, label: "Reset Password" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[200px] bg-primary/3 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-serif font-bold text-4xl tracking-widest luxury-gradient-text mb-1">TLIS</div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            TikTok Luxury Intelligence System
          </p>
        </div>

        <div className="luxury-card p-8 space-y-6">

          {/* ── Tabs (hidden during recovery flow) ── */}
          {tab !== "newpass" && (
            <div className="flex rounded-lg border border-border bg-black/40 p-1 gap-1">
              {visibleTabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold transition duration-200 tracking-wide",
                    tab === t.id
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Set New Password header (recovery flow) ── */}
          {tab === "newpass" && (
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground tracking-wide">Set New Password</p>
                <p className="text-xs text-muted-foreground">Choose a strong password for your account</p>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/30">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">{success}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* ── Sign In ── */}
          {tab === "login" && !success && (
            <form onSubmit={handleLogin} className="space-y-4">
              <InputField label="Email" type="email" value={email} onChange={setEmail}
                placeholder="you@example.com" autoComplete="email" />
              <InputField label="Password" type="password" value={password} onChange={setPassword}
                placeholder="••••••••" autoComplete="current-password" />
              <SubmitButton loading={submitting} icon={LogIn} label="Sign In" loadingLabel="Signing in…" />
              <button type="button" onClick={() => setTab("reset")}
                className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors py-1">
                Forgot your password?
              </button>
            </form>
          )}

          {/* ── Create Account ── */}
          {tab === "signup" && !success && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <InputField label="Email" type="email" value={email} onChange={setEmail}
                placeholder="you@example.com" autoComplete="email" />
              <InputField label="Password" type="password" value={password} onChange={setPassword}
                placeholder="Min. 8 characters" autoComplete="new-password" />
              <InputField label="Confirm Password" type="password" value={confirmPass} onChange={setConfirmPass}
                placeholder="Repeat password" autoComplete="new-password" />
              <SubmitButton loading={submitting} icon={UserPlus} label="Create Account" loadingLabel="Creating account…" />
            </form>
          )}

          {/* ── Reset Password ── */}
          {tab === "reset" && !success && (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your email address and we will send you a password reset link.
              </p>
              <InputField label="Email" type="email" value={email} onChange={setEmail}
                placeholder="you@example.com" autoComplete="email" />
              <SubmitButton loading={submitting} icon={KeyRound} label="Send Reset Link" loadingLabel="Sending…" />
            </form>
          )}

          {/* ── Set New Password (recovery callback) ── */}
          {tab === "newpass" && !success && (
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <InputField label="New Password" type="password" value={password} onChange={setPassword}
                placeholder="Min. 8 characters" autoComplete="new-password" />
              <InputField label="Confirm New Password" type="password" value={confirmPass} onChange={setConfirmPass}
                placeholder="Repeat password" autoComplete="new-password" />
              <SubmitButton loading={submitting} icon={ShieldCheck} label="Set New Password" loadingLabel="Saving…" />
            </form>
          )}

          {/* Footer */}
          {!success && tab !== "newpass" && (
            <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
              {tab === "login"  && (<>No account?{" "}<button onClick={() => setTab("signup")} className="text-primary hover:underline">Create one</button></>)}
              {tab === "signup" && (<>Already have an account?{" "}<button onClick={() => setTab("login")} className="text-primary hover:underline">Sign in</button></>)}
              {tab === "reset"  && (<>Remember it?{" "}<button onClick={() => setTab("login")} className="text-primary hover:underline">Sign in</button></>)}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/40 mt-6">
          Secured by Supabase Auth · End-to-end encrypted
        </p>
      </div>
    </div>
  );
}
