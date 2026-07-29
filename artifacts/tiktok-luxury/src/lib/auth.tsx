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
import { logAudit } from "./audit";

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
      try {
        const saved = localStorage.getItem("tlis_demo_user");
        if (saved) {
          const parsedUser = JSON.parse(saved) as User;
          setUser(parsedUser);
          setSession({
            access_token: "demo-access-token",
            refresh_token: "demo-refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: parsedUser,
          } as Session);
        }
      } catch (err) {
        console.warn("Failed to load demo user", err);
      }
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
    if (!supabase) {
      const demoUser: User = {
        id: "demo-" + btoa(email || "executive@tlis.luxury").replace(/=/g, "").slice(0, 12),
        email: email || "executive@tlis.luxury",
        app_metadata: { provider: "email" },
        user_metadata: { name: (email || "executive").split("@")[0] },
        aud: "authenticated",
        role: "authenticated",
        created_at: new Date().toISOString(),
      } as unknown as User;

      const demoSession = {
        access_token: "demo-access-token",
        refresh_token: "demo-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: demoUser,
      } as Session;

      try {
        localStorage.setItem("tlis_demo_user", JSON.stringify(demoUser));
      } catch (e) {
        console.warn("Failed to persist demo user", e);
      }

      setUser(demoUser);
      setSession(demoSession);
      void logAudit({ action: "Signed in (Demo Mode)", module: "auth", status: "success" });
      return null;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    void logAudit({ action: "Signed in", module: "auth", status: error ? "error" : "success" });
    return error?.message ?? null;
  }, []);

  const signUp = useCallback(async (
    email: string, password: string
  ): Promise<string | null> => {
    if (!supabase) {
      const demoUser: User = {
        id: "demo-" + btoa(email || "executive@tlis.luxury").replace(/=/g, "").slice(0, 12),
        email: email || "executive@tlis.luxury",
        app_metadata: { provider: "email" },
        user_metadata: { name: (email || "executive").split("@")[0] },
        aud: "authenticated",
        role: "authenticated",
        created_at: new Date().toISOString(),
      } as unknown as User;

      const demoSession = {
        access_token: "demo-access-token",
        refresh_token: "demo-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: demoUser,
      } as Session;

      try {
        localStorage.setItem("tlis_demo_user", JSON.stringify(demoUser));
      } catch (e) {
        console.warn("Failed to persist demo user", e);
      }

      setUser(demoUser);
      setSession(demoSession);
      void logAudit({ action: "Account Created (Demo Mode)", module: "auth", status: "success" });
      return null;
    }

    // Always redirect to the /login page so the user lands on the auth UI
    // after clicking the confirmation link.
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    if (!supabase) {
      try {
        localStorage.removeItem("tlis_demo_user");
      } catch (e) {
        console.warn(e);
      }
      setUser(null);
      setSession(null);
      void logAudit({ action: "Signed out (Demo Mode)", module: "auth" });
      return;
    }
    void logAudit({ action: "Signed out", module: "auth" });
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (
    email: string
  ): Promise<string | null> => {
    if (!supabase) {
      void logAudit({ action: "Password Reset Requested (Demo)", module: "auth" });
      return null;
    }
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return error?.message ?? null;
  }, []);

  const setNewPassword = useCallback(async (
    password: string
  ): Promise<string | null> => {
    if (!supabase) {
      return null;
    }
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
