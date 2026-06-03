import { useState, useEffect, useCallback, useRef } from "react";
import { checkSupabaseConnection, isSupabaseReady } from "@/lib/supabase";

export type SyncStatus = "idle" | "checking" | "syncing" | "synced" | "error" | "offline";

export interface SyncState {
  status: SyncStatus;
  isConnected: boolean;
  lastSynced: string | null;
  error: string | null;
}

const LAST_SYNCED_KEY = "tlis_last_synced";

export function useSync() {
  const [state, setState] = useState<SyncState>({
    status: isSupabaseReady() ? "checking" : "offline",
    isConnected: false,
    lastSynced: (() => {
      try { return localStorage.getItem(LAST_SYNCED_KEY); } catch { return null; }
    })(),
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Connection check on mount
  useEffect(() => {
    if (!isSupabaseReady()) {
      setState(s => ({ ...s, status: "offline", isConnected: false }));
      return;
    }

    checkSupabaseConnection().then(ok => {
      if (!mountedRef.current) return;
      setState(s => ({
        ...s,
        status: ok ? "idle" : "error",
        isConnected: ok,
        error: ok ? null : "Cannot reach database",
      }));
    });
  }, []);

  const setSyncing = useCallback(() => {
    setState(s => ({ ...s, status: "syncing", error: null }));
  }, []);

  const setSynced = useCallback(() => {
    const ts = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit",
    });
    try { localStorage.setItem(LAST_SYNCED_KEY, ts); } catch {}
    setState(s => ({ ...s, status: "synced", isConnected: true, lastSynced: ts, error: null }));
  }, []);

  const setError = useCallback((message: string) => {
    setState(s => ({ ...s, status: "error", error: message }));
  }, []);

  /**
   * Wrap any async cloud operation with sync status management.
   * The operation receives setSynced/setError callbacks via state
   * but the wrapper handles status transitions automatically.
   */
  const withSync = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    if (!isSupabaseReady()) return null;
    setSyncing();
    try {
      const result = await fn();
      setSynced();
      return result;
    } catch (err: any) {
      setError(err?.message ?? "Sync failed");
      return null;
    }
  }, [setSyncing, setSynced, setError]);

  return { ...state, setSyncing, setSynced, setError, withSync };
}
