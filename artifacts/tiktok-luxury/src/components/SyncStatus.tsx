import { Cloud, CloudOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { type SyncStatus } from "@/hooks/useSync";
import { isSupabaseReady } from "@/lib/supabase";

interface Props {
  status: SyncStatus;
  lastSynced: string | null;
  isConnected: boolean;
  error: string | null;
}

export function SyncStatusBar({ status, lastSynced, isConnected, error }: Props) {
  if (!isSupabaseReady()) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-muted/30 bg-muted/10">
        <CloudOff className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
        <div>
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Local only</p>
        </div>
      </div>
    );
  }

  const config = {
    idle: {
      icon: Cloud,
      label: "Cloud ready",
      sub: lastSynced ? `Last sync ${lastSynced}` : "Not yet synced",
      iconColor: "text-muted-foreground/60",
      dotColor: "bg-muted-foreground/40",
    },
    checking: {
      icon: Loader2,
      label: "Connecting…",
      sub: "Reaching Supabase",
      iconColor: "text-primary/60",
      dotColor: "bg-primary/40",
    },
    syncing: {
      icon: Loader2,
      label: "Syncing…",
      sub: "Saving to cloud",
      iconColor: "text-primary",
      dotColor: "bg-primary",
    },
    synced: {
      icon: CheckCircle2,
      label: "Cloud synced",
      sub: lastSynced ? `Synced at ${lastSynced}` : "Just now",
      iconColor: "text-chart-2",
      dotColor: "bg-chart-2",
    },
    error: {
      icon: AlertCircle,
      label: "Sync error",
      sub: error ?? "Check connection",
      iconColor: "text-destructive",
      dotColor: "bg-destructive",
    },
    offline: {
      icon: CloudOff,
      label: "Offline mode",
      sub: "Data saved locally",
      iconColor: "text-muted-foreground/50",
      dotColor: "bg-muted-foreground/30",
    },
  }[status];

  const Icon = config.icon;
  const isSpinning = status === "checking" || status === "syncing";

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 ${
      status === "synced"
        ? "border-chart-2/20 bg-chart-2/5"
        : status === "error"
        ? "border-destructive/20 bg-destructive/5"
        : status === "syncing"
        ? "border-primary/20 bg-primary/5"
        : "border-muted/30 bg-muted/10"
    }`}>
      <Icon className={`h-3 w-3 flex-shrink-0 ${config.iconColor} ${isSpinning ? "animate-spin" : ""}`} />
      <div className="min-w-0">
        <p className={`text-[10px] font-semibold uppercase tracking-wider truncate ${config.iconColor}`}>
          {config.label}
        </p>
        <p className="text-[9px] text-muted-foreground/50 truncate">{config.sub}</p>
      </div>
    </div>
  );
}
