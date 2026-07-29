import { useState, useEffect } from "react";
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, Database, Cpu, HardDrive, ShieldCheck, Zap } from "lucide-react";
import { fetchPlatformHealth, PlatformHealthReport } from "@/lib/health-monitor";
import { cn } from "@/lib/utils";

export function HealthMonitorBar() {
  const [report, setReport] = useState<PlatformHealthReport | null>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    try {
      const data = await fetchPlatformHealth();
      setReport(data);
    } catch (err) {
      console.error("Health check failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  if (!report) return null;

  return (
    <div className="luxury-card p-4 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-background space-y-3">
      <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">
            Platform System Health
          </h2>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border",
            report.overallStatus === "Operational" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"
          )}>
            {report.overallStatus}
          </span>
        </div>

        <button
          onClick={runCheck}
          disabled={loading}
          className="text-[11px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin text-emerald-400")} />
          <span>{loading ? "Diagnosing..." : "Run Diagnostics"}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {report.metrics.map(metric => (
          <div
            key={metric.id}
            className="p-2.5 rounded-lg border border-border/60 bg-card/60 hover:bg-card/90 transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-medium text-muted-foreground truncate">{metric.category}</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-xs font-semibold text-foreground truncate" title={metric.name}>
              {metric.name.split(" ")[0]} Service
            </div>
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/30 text-[10px] font-mono text-muted-foreground">
              <span className="text-emerald-400">{metric.status}</span>
              <span>{metric.latencyMs}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
