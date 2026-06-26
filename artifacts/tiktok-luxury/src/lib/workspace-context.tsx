import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { TikTokWorkspace } from "./supabase";

// ── Storage key ───────────────────────────────────────────────────────────────

const ACTIVE_WS_KEY = "tlis_active_workspace_id";

// ── Context type ──────────────────────────────────────────────────────────────

interface WorkspaceContextValue {
  activeWorkspace: TikTokWorkspace | null;
  setActiveWorkspace: (w: TikTokWorkspace | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  activeWorkspace: null,
  setActiveWorkspace: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspaceState] = useState<TikTokWorkspace | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_WS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as TikTokWorkspace;
        setActiveWorkspaceState(parsed);
      }
    } catch {
      localStorage.removeItem(ACTIVE_WS_KEY);
    }
  }, []);

  const setActiveWorkspace = useCallback((w: TikTokWorkspace | null) => {
    setActiveWorkspaceState(w);
    if (w) {
      localStorage.setItem(ACTIVE_WS_KEY, JSON.stringify(w));
    } else {
      localStorage.removeItem(ACTIVE_WS_KEY);
    }
  }, []);

  return (
    <WorkspaceContext.Provider value={{ activeWorkspace, setActiveWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export function useActiveWorkspace(): WorkspaceContextValue {
  return useContext(WorkspaceContext);
}
