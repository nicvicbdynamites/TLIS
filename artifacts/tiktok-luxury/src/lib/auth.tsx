import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user:            User | null;
  session:         Session | null;
  loading:         boolean;
  signIn:          (email: string, password: string) => Promise<string | null>;
  signUp:          (email: string, password: string) => Promise<string | null>;
  signOut:         () => Promise<void>;
  resetPassword:   (email: string) => Promise<string | null>;
  setNewPassword:  (password: string) => Promise<string | null>;
}

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Hydrate from persisted session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Auth operations ─────────────────────────────────────────────────────

  const signIn = useCallback(async (
    email: string, password: string
  ): Promise<string | null> => {
    if (!supabase) return "Authentication not configured";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signUp = useCallback(async (
    email: string, password: string
  ): Promise<string | null> => {
    if (!supabase) return "Authentication not configured";
    // Always redirect to the /login page so the user lands on the auth UI
    // after clicking the confirmation link.
    // window.location.origin resolves to the correct domain in both dev and
    // production — Supabase just needs that domain whitelisted (see dashboard).
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (
    email: string
  ): Promise<string | null> => {
    if (!supabase) return "Authentication not configured";
    // Redirect to /login so the recovery token lands on the auth page, which
    // detects type=recovery in the URL hash and shows the set-new-password form.
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return error?.message ?? null;
  }, []);

  const setNewPassword = useCallback(async (
    password: string
  ): Promise<string | null> => {
    if (!supabase) return "Authentication not configured";
    const { error } = await supabase.auth.updateUser({ password });
    return error?.message ?? null;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, signOut, resetPassword, setNewPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Consumer hook ──────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
