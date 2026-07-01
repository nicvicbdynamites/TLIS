import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  CheckCircle2, AlertCircle, Loader2, Cpu, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { checkSupabaseConnection } from "@/lib/supabase";

// ── Status indicator ──────────────────────────────────────────────────────

type StatusState = "loading" | "ok" | "warn" | "error";

function StatusDot({ state }: { state: StatusState }) {
  if (state === "loading") return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  if (state === "ok")      return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
  if (state === "warn")    return <AlertCircle  className="h-3 w-3 text-amber-400"   />;
  return                          <AlertCircle  className="h-3 w-3 text-destructive"  />;
}

function StatusRow({
  icon: Icon, label, value, state,
}: {
  icon:  typeof Database;
  label: string;
  value: string;
  state: StatusState;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3 text-primary/50 flex-shrink-0" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <StatusDot state={state} />
        <span className={cn(
          "text-[11px] font-mono",
          state === "ok"      ? "text-emerald-400"      :
          state === "warn"    ? "text-amber-400"         :
          state === "error"   ? "text-destructive"       :
          "text-muted-foreground",
        )}>
          {value}
        </span>
      </div>
    </div>
  );
}

// ── Quick link item ───────────────────────────────────────────────────────

function QuickLink({ href, label }: { href: string; label: string }) {
  const [location] = useLocation();
  const isActive = location === href;
  return (
    <Link href={href}>
      <span className={cn(
        "block text-sm py-1 transition-colors cursor-pointer min-h-[44px] flex items-center",
        isActive
          ? "text-primary font-medium"
          : "text-muted-foreground hover:text-primary",
      )}>
        {label}
      </span>
    </Link>
  );
}

// ── Placeholder link ──────────────────────────────────────────────────────

function PlaceholderLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => {}}
      className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors min-h-[44px] flex items-center"
    >
      {label}
    </button>
  );
}

// ── Main footer ───────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { href: "/",             label: "Home"               },
  { href: "/workspace",    label: "TikTok Workspace"   },
  { href: "/accounts",     label: "TikTok Accounts"    },
  { href: "/content-pack", label: "Content Generator"  },
  { href: "/vault",        label: "Intelligence Vault" },
  { href: "/calendar",     label: "Content Calendar"   },
  { href: "/settings",     label: "Settings"           },
];

const PLACEHOLDER_LINKS = [
  "Privacy Policy", "Terms of Service", "Support", "Documentation", "Contact",
];

export function AppFooter() {
  const year = new Date().getFullYear();
  const env  = import.meta.env.MODE === "production" ? "Production" : "Development";

  const [supaState, setSupaState] = useState<StatusState>("loading");
  const [aiState,   setAiState]   = useState<StatusState>("loading");

  useEffect(() => {
    // Supabase check
    checkSupabaseConnection()
      .then(ok  => setSupaState(ok ? "ok"   : "error"))
      .catch(()  => setSupaState("error"));

    // AI / API server ping
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    fetch("/api/healthz", { signal: ctrl.signal })
      .then(() => setAiState("ok"))
      .catch(() => setAiState("warn"))   // warn = gemini key set but no healthz endpoint
      .finally(() => clearTimeout(timer));
  }, []);

  return (
    <footer className="mt-auto pt-10">
      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-10" />

      {/* ── Main 3-column grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-10">

        {/* Left — Brand */}
        <div className="flex flex-col gap-4 text-center md:text-left">
          <div>
            <div className="font-serif font-bold text-2xl tracking-widest luxury-gradient-text mb-1">
              TLIS
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              TikTok Luxury Intelligence System
            </p>
          </div>
          <p className="text-xs text-muted-foreground/70 leading-relaxed max-w-xs mx-auto md:mx-0">
            AI-powered Luxury Social Media Intelligence Platform for elite TikTok creators. Real-time data. Cinematic content. Unfair advantage.
          </p>
          {/* Version badge */}
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-primary/25 bg-primary/8 text-primary/70">
              v0.15.0 Beta
            </span>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-border bg-muted/10 text-muted-foreground/60">
              {env}
            </span>
          </div>
        </div>

        {/* Center — Quick Links */}
        <div className="text-center md:text-left">
          <p className="text-[10px] uppercase tracking-widest text-primary/70 font-semibold mb-4">
            Quick Links
          </p>
          <nav aria-label="Footer navigation" className="flex flex-col gap-0 items-center md:items-start">
            {QUICK_LINKS.map(link => (
              <QuickLink key={link.href} href={link.href} label={link.label} />
            ))}
          </nav>
        </div>

        {/* Right — System Information */}
        <div className="text-center md:text-left lg:text-left">
          <p className="text-[10px] uppercase tracking-widest text-primary/70 font-semibold mb-4">
            System Information
          </p>
          <div className="space-y-0 max-w-xs mx-auto md:mx-0">
            <StatusRow
              icon={Cpu}
              label="Version"
              value="v0.15.0 Beta"
              state="ok"
            />
            <StatusRow
              icon={Cpu}
              label="Environment"
              value={env}
              state="ok"
            />
            <StatusRow
              icon={Database}
              label="Database"
              value={supaState === "loading" ? "Checking…" : supaState === "ok" ? "Connected" : "Unreachable"}
              state={supaState}
            />
            <StatusRow
              icon={Cpu}
              label="AI Engine"
              value={aiState === "loading" ? "Checking…" : aiState === "ok" ? "Online" : "Gemini Ready"}
              state={aiState === "warn" ? "ok" : aiState}
            />
            <StatusRow
              icon={Cpu}
              label="Build"
              value="Production"
              state="ok"
            />
          </div>
        </div>
      </div>

      {/* ── Optional placeholder links ── */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 mb-8">
        {PLACEHOLDER_LINKS.map(label => (
          <PlaceholderLink key={label} label={label} />
        ))}
      </div>

      {/* ── Bottom bar ── */}
      <div className="h-px bg-border/30 mb-6" />
      <div className="flex flex-col items-center gap-2 pb-4 text-center">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/60">
          © {year}{" "}
          <span className="text-primary/60">Integrations</span>
          {" · "}
          <span className="text-primary/60">Workflows</span>
          {" · "}
          <span className="text-primary/60">Dynamics</span>
        </p>
        <p className="text-[10px] text-muted-foreground/40">All Rights Reserved.</p>
        <div className="mt-1 space-y-1">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">
            Powered by Artificial Intelligence
          </p>
          <p className="text-[10px] text-muted-foreground/30 font-mono">
            Built with React · Vite · Supabase · Gemini
          </p>
        </div>
      </div>
    </footer>
  );
}
