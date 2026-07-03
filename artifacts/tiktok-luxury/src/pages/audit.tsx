import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ScrollText, RefreshCw, CheckCircle2, XCircle, Clock,
  Loader2, Filter,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { fetchAuditLog, type AuditLogEntry, type AuditStatus } from "@/lib/audit";

const STATUS_STYLES: Record<AuditStatus, string> = {
  success: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  error:   "text-destructive border-destructive/30 bg-destructive/10",
  pending: "text-amber-400 border-amber-400/30 bg-amber-400/10",
};

const STATUS_ICON: Record<AuditStatus, typeof CheckCircle2> = {
  success: CheckCircle2,
  error:   XCircle,
  pending: Clock,
};

export default function AuditLogPage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | AuditStatus>("all");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const load = useCallback(() => {
    setLoading(true);
    fetchAuditLog(200)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const visible = statusFilter === "all" ? entries : entries.filter(e => e.status === statusFilter);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 5</p>
          <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-2">
            Audit Log
          </h1>
          <p className="text-muted-foreground text-sm">
            A record of actions taken on your account — sign-ins, workspace changes, and AI usage.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {(["all", "success", "error", "pending"] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs border capitalize transition",
              statusFilter === s
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border text-muted-foreground hover:border-primary/20",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="luxury-card">
        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading activity...
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <ScrollText className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No activity recorded yet. Actions like signing in, saving preferences, and
              generating content will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visible.map(entry => {
              const StatusIcon = STATUS_ICON[entry.status];
              return (
                <div key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground font-medium truncate">{entry.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.module && <span className="font-mono">{entry.module}</span>}
                      {entry.module && entry.provider && " · "}
                      {entry.provider && <span className="capitalize">{entry.provider}</span>}
                      {(entry.module || entry.provider) && " · "}
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {entry.durationMs != null && (
                      <span className="text-[10px] text-muted-foreground font-mono">{entry.durationMs}ms</span>
                    )}
                    <span className={cn(
                      "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize",
                      STATUS_STYLES[entry.status],
                    )}>
                      <StatusIcon className="h-3 w-3" /> {entry.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
