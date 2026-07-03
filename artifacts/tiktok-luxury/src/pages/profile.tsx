import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  UserCircle, LogOut, Shield, Sparkles, Clock, Database,
  CalendarDays, Package, Zap, RefreshCw, CheckCircle,
  AlertCircle, Crown, Loader2, ArrowRight, Lock, Building2, Users, Save,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  migrateDeviceDataToUser,
  fetchUserProfile,
  createOrUpdateProfile,
  updateProfilePreferences,
  type UserProfile,
} from "@/lib/supabase";
import { loadVault } from "@/lib/vault";
import { loadCalendar } from "@/lib/calendar";
import { loadUsage } from "@/lib/usage";
import { fetchOrCreateMyWorkspace, type MyWorkspaceContext } from "@/lib/organization";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type Role } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Los_Angeles", "America/Chicago",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Singapore", "Asia/Tokyo", "Asia/Dubai", "Australia/Sydney",
];

const AI_PROVIDER_OPTIONS = [
  { value: "gemini",   label: "Gemini"   },
  { value: "openai",   label: "OpenAI"   },
  { value: "claude",   label: "Claude"   },
  { value: "deepseek", label: "DeepSeek" },
  { value: "grok",     label: "Grok"     },
  { value: "mistral",  label: "Mistral"  },
];

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      title={ROLE_DESCRIPTIONS[role]}
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-primary/10 border-primary/30 text-primary"
    >
      <Shield className="h-2.5 w-2.5" />
      {ROLE_LABELS[role]}
    </span>
  );
}

// ── Plan config ────────────────────────────────────────────────────────────

const PLAN_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  free:       { label: "Free",       color: "text-muted-foreground", description: "100 AI generations / month" },
  pro:        { label: "Pro",        color: "text-primary",           description: "1,000 AI generations / month" },
  enterprise: { label: "Enterprise", color: "text-yellow-400",        description: "Unlimited generations" },
};

function PlanBadge({ plan }: { plan: string }) {
  const cfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free!;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border",
      plan === "free"       && "bg-muted/20 border-border text-muted-foreground",
      plan === "pro"        && "bg-primary/10 border-primary/30 text-primary",
      plan === "enterprise" && "bg-yellow-400/10 border-yellow-400/30 text-yellow-400",
    )}>
      {plan !== "free" && <Crown className="h-2.5 w-2.5" />}
      {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value }: {
  icon: typeof Zap; label: string; value: number | string;
}) {
  return (
    <div className="luxury-card p-4 flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-foreground font-mono">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [, navigate] = useLocation();

  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [migrating, setMigrating]     = useState(false);
  const [migrateStatus, setMigrateStatus] = useState<"idle" | "success" | "error">("idle");
  const [migrateMessage, setMigrateMessage] = useState("");
  const [signingOut, setSigningOut]   = useState(false);

  // Module 2/3/4 — workspace context + editable preferences
  const [workspaceCtx, setWorkspaceCtx] = useState<MyWorkspaceContext | null>(null);
  const [prefTimezone, setPrefTimezone] = useState("UTC");
  const [prefProvider, setPrefProvider] = useState("gemini");
  const [prefSaving, setPrefSaving]     = useState(false);
  const [prefSaved, setPrefSaved]       = useState(false);

  // Local stats
  const vaultCount    = loadVault().entries.length;
  const calendarCount = loadCalendar().length;
  const historyCount  = loadUsage().history.length;

  // Guard: redirect to /login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  // Load profile from Supabase
  useEffect(() => {
    if (!user) return;
    createOrUpdateProfile(user).then(() =>
      fetchUserProfile(user.id).then(p => {
        setProfile(p);
        if (p) {
          setPrefTimezone(p.timezone);
          setPrefProvider(p.preferredAiProvider);
        }
        setProfileLoading(false);
      })
    ).catch(() => setProfileLoading(false));
  }, [user]);

  // Load organization/workspace context (Module 4) — auto-provisions if missing
  useEffect(() => {
    if (!user) return;
    fetchOrCreateMyWorkspace(user.id).then(setWorkspaceCtx).catch(() => setWorkspaceCtx(null));
  }, [user]);

  const handleSavePreferences = useCallback(async () => {
    if (!user) return;
    setPrefSaving(true);
    setPrefSaved(false);
    const ok = await updateProfilePreferences(user.id, {
      timezone: prefTimezone,
      preferredAiProvider: prefProvider,
    });
    setPrefSaving(false);
    if (ok) {
      setPrefSaved(true);
      setProfile(prev => prev ? { ...prev, timezone: prefTimezone, preferredAiProvider: prefProvider } : prev);
      setTimeout(() => setPrefSaved(false), 2500);
      void logAudit({ action: "Updated preferences", module: "profile" });
    }
  }, [user, prefTimezone, prefProvider]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    await signOut();
    navigate("/");
  }, [signOut, navigate]);

  const handleMigrate = useCallback(async () => {
    if (!user) return;
    setMigrating(true);
    setMigrateStatus("idle");
    const result = await migrateDeviceDataToUser(user.id);
    setMigrating(false);
    if (result.success) {
      setMigrateStatus("success");
      setMigrateMessage(
        result.migrated > 0
          ? `${result.migrated} item${result.migrated !== 1 ? "s" : ""} linked to your account.`
          : "All data is already linked to your account."
      );
    } else {
      setMigrateStatus("error");
      setMigrateMessage(result.error ?? "Migration failed. Apply the schema from supabase-schema.sql in your Supabase dashboard first.");
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const initials = user.email
    ? user.email.slice(0, 2).toUpperCase()
    : "EL";
  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
    : "Unknown";
  const plan = profile?.plan ?? "free";
  const planCfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free!;
  const creditsUsed  = profile?.creditsUsed  ?? historyCount;
  const creditsLimit = profile?.creditsLimit ?? 100;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 12</p>
        <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-2">
          User Profile
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your account, subscription, and data ownership.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Identity Card ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="luxury-card p-6 space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4 pb-4 border-b border-border">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/80 to-primary/20 p-[2px]">
                <div className="h-full w-full rounded-full bg-sidebar flex items-center justify-center">
                  <span className="font-serif text-2xl font-bold text-primary">{initials}</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                  {user.email}
                </p>
                <div className="mt-2">
                  <PlanBadge plan={plan} />
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Member since
                </span>
                <span className="text-foreground font-mono">{joinedDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Auth provider
                </span>
                <span className="text-foreground">Email</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Plan
                </span>
                <span className={planCfg.color}>{planCfg.label}</span>
              </div>
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold tracking-wide transition duration-200",
              signingOut
                ? "opacity-50 cursor-not-allowed border-border text-muted-foreground"
                : "border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive"
            )}
          >
            {signingOut
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing out...</>
              : <><LogOut className="h-4 w-4" /> Sign Out</>}
          </button>
        </div>

        {/* ── Right Panel ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription */}
          <div className="luxury-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">
                  Subscription
                </h2>
              </div>
              <PlanBadge plan={plan} />
            </div>

            {/* Credits usage bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>AI Generations this month</span>
                <span className="font-mono">
                  {creditsUsed} / {plan === "enterprise" ? "∞" : creditsLimit}
                </span>
              </div>
              {plan !== "enterprise" && (
                <div className="h-1.5 rounded-full bg-black/40 border border-border overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${Math.min((creditsUsed / creditsLimit) * 100, 100)}%` }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">{planCfg.description}</p>
            </div>

            {plan === "free" && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
                <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">Upgrade to Pro</p>
                  <p className="text-xs text-muted-foreground">Unlock 1,000 generations/month, priority AI, and more.</p>
                </div>
                <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded font-mono">
                  Coming Soon
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Your Content Library
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Zap}         label="Generations" value={historyCount}  />
              <StatCard icon={Database}    label="Vault Items"  value={vaultCount}    />
              <StatCard icon={CalendarDays} label="Calendar"    value={calendarCount} />
              <StatCard icon={Package}     label="Packs"       value="—"             />
            </div>
          </div>

          {/* Workspace & Preferences (Modules 2/3/4) */}
          <div className="luxury-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">
                  Workspace & Preferences
                </h2>
              </div>
              {profile && <RoleBadge role={profile.role} />}
            </div>

            {workspaceCtx && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-black/20 border border-border">
                  <p className="text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Building2 className="h-3 w-3" /> Organization
                  </p>
                  <p className="text-foreground font-medium truncate">{workspaceCtx.organization.name}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-border">
                  <p className="text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Package className="h-3 w-3" /> Workspace
                  </p>
                  <p className="text-foreground font-medium truncate">{workspaceCtx.workspace.name}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-border">
                  <p className="text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Users className="h-3 w-3" /> Members
                  </p>
                  <p className="text-foreground font-medium">{workspaceCtx.memberCount}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Timezone</label>
                <select
                  value={prefTimezone}
                  onChange={(e) => setPrefTimezone(e.target.value)}
                  className="w-full bg-black/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Preferred AI Provider</label>
                <select
                  value={prefProvider}
                  onChange={(e) => setPrefProvider(e.target.value)}
                  className="w-full bg-black/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {AI_PROVIDER_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSavePreferences}
                disabled={prefSaving}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition duration-200",
                  prefSaving
                    ? "opacity-50 cursor-not-allowed bg-primary/10 text-primary"
                    : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                )}
              >
                {prefSaving
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
                  : <><Save className="h-3.5 w-3.5" /> Save Preferences</>}
              </button>
              {prefSaved && (
                <span className="flex items-center gap-1.5 text-xs text-primary">
                  <CheckCircle className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>
          </div>

          {/* Data Migration */}
          <div className="luxury-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">
                Data Ownership
              </h2>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Your content is currently stored by device ID. Migrate it to link everything
              to your account — so you can access it from any device after signing in.
            </p>

            {migrateStatus === "success" && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-foreground">{migrateMessage}</p>
              </div>
            )}

            {migrateStatus === "error" && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-xs text-destructive">{migrateMessage}</p>
              </div>
            )}

            <button
              onClick={handleMigrate}
              disabled={migrating || migrateStatus === "success"}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition duration-200",
                migrateStatus === "success"
                  ? "opacity-50 cursor-not-allowed border-border text-muted-foreground"
                  : migrating
                    ? "opacity-70 cursor-not-allowed border-primary/20 text-primary"
                    : "bg-primary/10 hover:bg-primary/20 border-primary/30 hover:border-primary/50 text-primary"
              )}
            >
              {migrating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Migrating data...</>
              ) : migrateStatus === "success" ? (
                <><CheckCircle className="h-4 w-4" /> Migration complete</>
              ) : (
                <><RefreshCw className="h-4 w-4" /> Link My Data to Account</>
              )}
            </button>

            <p className="text-[10px] text-muted-foreground/60">
              Requires the Supabase schema to be applied in your Supabase dashboard.
              See <code className="font-mono">supabase-schema.sql</code> for the full DDL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
