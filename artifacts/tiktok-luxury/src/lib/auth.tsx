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
  user:         User | null;
  session:      Session | null;
  loading:      boolean;
  signIn:        (email: string, password: string) => Promise<string | null>;
  signUp:        (email: string, password: string) => Promise<string | null>;
  signOut:       () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
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
    const redirectTo =
      `${window.location.origin}${(import.meta.env.BASE_URL as string | undefined) ?? "/"}`;
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
    const redirectTo =
      `${window.location.origin}${(import.meta.env.BASE_URL as string | undefined) ?? "/"}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return error?.message ?? null;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, signOut, resetPassword }}
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
