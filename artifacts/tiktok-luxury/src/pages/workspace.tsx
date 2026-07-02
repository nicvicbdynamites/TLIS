import { useState, useEffect, useCallback } from "react";
import {
  Briefcase, Plus, Pencil, Trash2, ExternalLink, ArrowLeft,
  Package, Database, CalendarDays, Globe,
  CheckCircle, Pause, Archive,
  ChevronDown, AlertCircle, RefreshCw, LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  fetchWorkspacesFromCloud,
  upsertWorkspaceToCloud,
  deleteWorkspaceFromCloud,
  fetchWorkspaceStatsFromCloud,
  fetchContentPacksFromCloud,
  fetchVaultEntriesFromCloud,
  fetchCalendarFromCloud,
  type TikTokWorkspace,
  type WorkspaceStats,
  type ContentPackRecord,
} from "@/lib/supabase";
import type { VaultEntry } from "@/lib/vault";
import type { CalendarPost } from "@/lib/calendar";
import { useActiveWorkspace } from "@/lib/workspace-context";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS = ["TikTok", "Instagram", "Facebook", "YouTube", "X"];

const NICHES = [
  "Quiet Luxury Lifestyle",
  "Dark Feminine Aesthetic",
  "Old Money Fashion",
  "Silent Wealth Signals",
  "Minimalist Wealth Flex",
  "Luxury Morning Routine",
  "Cinematic Travel",
  "Understated Opulence",
  "Luxury Fashion & Style",
  "High-End Beauty",
  "Fine Dining & Gastronomy",
  "Other",
];

const AUDIENCES = [
  "Luxury Aspirants 18–24",
  "Affluent Millennials 25–34",
  "High-Net-Worth 35–45",
  "Fashion-Forward Women",
  "Old Money Enthusiasts",
  "Minimalist Lifestyle Seekers",
  "Luxury Travelers",
  "Other",
];

const GOALS = [
  "Grow Followers",
  "Increase Views",
  "Drive Sales",
  "Build Brand",
  "Educate Audience",
  "Entertainment",
  "Other",
];

const FREQUENCIES = [
  "Twice Daily",
  "Daily",
  "5x Week",
  "3x Week",
  "2x Week",
  "Weekly",
];

const STATUSES: Array<{ value: TikTokWorkspace["status"]; label: string }> = [
  { value: "active",   label: "Active"   },
  { value: "paused",   label: "Paused"   },
  { value: "archived", label: "Archived" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type FormState = Omit<TikTokWorkspace, "id" | "userId" | "createdAt" | "updatedAt">;
type PageView  = "list" | "create" | "edit" | "detail";
type DetailTab = "overview" | "packs" | "vault" | "calendar";

function emptyForm(): FormState {
  return {
    workspaceName:    "",
    accountName:      "",
    username:         "",
    platform:         "TikTok",
    niche:            NICHES[0],
    audience:         AUDIENCES[0],
    goal:             GOALS[0],
    postingFrequency: FREQUENCIES[1],
    status:           "active",
    notes:            "",
  };
}

// ── Status helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TikTokWorkspace["status"] }) {
  if (status === "active")
    return (
      <span className="flex items-center gap-1 text-xs text-green-400">
        <CheckCircle className="h-3 w-3" /> Active
      </span>
    );
  if (status === "paused")
    return (
      <span className="flex items-center gap-1 text-xs text-yellow-400">
        <Pause className="h-3 w-3" /> Paused
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Archive className="h-3 w-3" /> Archived
    </span>
  );
}

// ── Form sub-components ───────────────────────────────────────────────────────

function InputField({
  label, value, onChange, placeholder = "", required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-card border border-card-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition min-h-[44px]"
      />
    </div>
  );
}

function SelectField({
  label, value, options, onChange,
}: {
  label: string; value: string;
  options: string[] | Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-card border border-card-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition cursor-pointer pr-9 min-h-[44px]"
        >
          {options.map(o =>
            typeof o === "string"
              ? <option key={o} value={o} className="bg-card">{o}</option>
              : <option key={o.value} value={o.value} className="bg-card">{o.label}</option>
          )}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

function TextAreaField({
  label, value, onChange, placeholder = "", rows = 4,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-card border border-card-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition resize-none"
      />
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value,
}: {
  icon: React.ElementType; label: string; value: number | string;
}) {
  return (
    <div className="luxury-card p-5 flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20 flex-shrink-0 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Workspace Card (list item) ────────────────────────────────────────────────

function WorkspaceCard({
  workspace, onEdit, onDelete, onOpen, deleting, isActive,
}: {
  workspace: TikTokWorkspace;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
  deleting: boolean;
  isActive: boolean;
}) {
  return (
    <div className={cn("luxury-card p-5 space-y-4 transition-colors", isActive ? "border-primary/50 shadow-sm shadow-primary/10" : "hover:border-primary/30")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 text-primary border", isActive ? "bg-primary/20 border-primary/40" : "bg-primary/10 border-primary/20")}>
            <Globe className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground truncate">{workspace.workspaceName}</h3>
              {isActive && (
                <span className="flex-shrink-0 text-[9px] font-mono uppercase tracking-widest text-primary bg-primary/15 border border-primary/30 px-1.5 py-0.5 rounded">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {workspace.username ? `@${workspace.username}` : "—"}
              {workspace.accountName ? ` · ${workspace.accountName}` : ""}
            </p>
          </div>
        </div>
        <StatusBadge status={workspace.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Platform</p>
          <p className="text-foreground font-medium">{workspace.platform}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Niche</p>
          <p className="text-foreground truncate">{workspace.niche || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Goal</p>
          <p className="text-foreground truncate">{workspace.goal || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Audience</p>
          <p className="text-foreground truncate">{workspace.audience || "—"}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          onClick={onOpen}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary transition min-h-[44px] flex-1 justify-center"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {isActive ? "Open (Active)" : "Open & Activate"}
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-secondary/50 border border-border text-muted-foreground hover:text-foreground transition min-h-[44px]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-destructive/10 border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition min-h-[44px] disabled:opacity-50"
        >
          {deleting
            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ── Workspace Form ────────────────────────────────────────────────────────────

function WorkspaceForm({
  initial, onSave, onCancel, saving, error, mode,
}: {
  initial: FormState;
  onSave:  (f: FormState) => void;
  onCancel: () => void;
  saving:  boolean;
  error:   string | null;
  mode:    "create" | "edit";
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = (key: keyof FormState) => (v: string) =>
    setForm(f => ({ ...f, [key]: v }));

  return (
    <form
      onSubmit={e => { e.preventDefault(); if (form.workspaceName.trim()) onSave(form); }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="p-2.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {mode === "create" ? "New Workspace" : "Edit Workspace"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {mode === "create"
              ? "Set up a new account workspace"
              : "Update workspace details"}
          </p>
        </div>
      </div>

      <div className="luxury-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Workspace Name" required
            value={form.workspaceName} onChange={set("workspaceName")}
            placeholder="e.g. My Luxury Brand"
          />
          <InputField
            label="Account Name"
            value={form.accountName} onChange={set("accountName")}
            placeholder="Display name on platform"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Username"
            value={form.username} onChange={set("username")}
            placeholder="@handle"
          />
          <SelectField
            label="Platform"
            value={form.platform} options={PLATFORMS} onChange={set("platform")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Niche"
            value={form.niche} options={NICHES} onChange={set("niche")}
          />
          <SelectField
            label="Target Audience"
            value={form.audience} options={AUDIENCES} onChange={set("audience")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Primary Goal"
            value={form.goal} options={GOALS} onChange={set("goal")}
          />
          <SelectField
            label="Posting Frequency"
            value={form.postingFrequency} options={FREQUENCIES} onChange={set("postingFrequency")}
          />
        </div>

        {mode === "edit" && (
          <SelectField
            label="Status"
            value={form.status} options={STATUSES} onChange={set("status")}
          />
        )}

        <TextAreaField
          label="Notes"
          value={form.notes} onChange={set("notes")}
          placeholder="Strategy notes, content pillars, brand guidelines, key dates…"
        />

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          type="submit"
          disabled={saving || !form.workspaceName.trim()}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition disabled:opacity-50 min-h-[44px] flex-1 sm:flex-none justify-center"
        >
          {saving ? (
            <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</>
          ) : mode === "create" ? (
            <><Plus className="h-4 w-4" /> Save Workspace</>
          ) : (
            <><CheckCircle className="h-4 w-4" /> Update Workspace</>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 text-sm transition min-h-[44px]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Workspace Detail ──────────────────────────────────────────────────────────

function WorkspaceDetail({
  workspace, onBack, onEdit,
}: {
  workspace: TikTokWorkspace;
  onBack:  () => void;
  onEdit:  () => void;
}) {
  const [tab, setTab]         = useState<DetailTab>("overview");
  const [packs, setPacks]     = useState<ContentPackRecord[]>([]);
  const [vault, setVault]     = useState<VaultEntry[]>([]);
  const [posts, setPosts]     = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchContentPacksFromCloud(),
      fetchVaultEntriesFromCloud(),
      fetchCalendarFromCloud(),
    ]).then(([cp, ve, cal]) => {
      setPacks(cp.filter(p => p.workspaceId === workspace.id));
      setVault(ve.filter(e => e.niche === workspace.niche));
      setPosts(cal.filter(p => p.niche === workspace.niche));
    }).finally(() => setLoading(false));
  }, [workspace.id, workspace.niche]);

  const tabs: Array<{ id: DetailTab; label: string; count: number; icon: React.ElementType }> = [
    { id: "overview",  label: "Overview",       count: 0,            icon: Briefcase    },
    { id: "packs",     label: "Content Packs",  count: packs.length, icon: Package      },
    { id: "vault",     label: "Vault Entries",  count: vault.length, icon: Database     },
    { id: "calendar",  label: "Calendar Posts", count: posts.length, icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="p-2.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-foreground truncate">{workspace.workspaceName}</h2>
            <StatusBadge status={workspace.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {workspace.username ? `@${workspace.username} · ` : ""}{workspace.platform}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition min-h-[44px]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border no-scrollbar">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition min-h-[44px] rounded-t-lg border-b-2",
              tab === t.id
                ? "text-primary border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30 border-transparent"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.id !== "overview" && t.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-mono">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="luxury-card p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {([
              ["Account Name",      workspace.accountName      || "—"],
              ["Username",          workspace.username ? `@${workspace.username}` : "—"],
              ["Platform",          workspace.platform],
              ["Niche",             workspace.niche            || "—"],
              ["Target Audience",   workspace.audience         || "—"],
              ["Primary Goal",      workspace.goal             || "—"],
              ["Posting Frequency", workspace.postingFrequency || "—"],
              ["Status",            workspace.status],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
                <p className="text-foreground capitalize">{value}</p>
              </div>
            ))}
          </div>

          {workspace.notes && (
            <div className="pt-4 border-t border-border">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{workspace.notes}</p>
            </div>
          )}

          <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
            <p>Created: {new Date(workspace.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p>Updated: {new Date(workspace.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
            <span className="text-primary font-medium">Multi-platform ready — </span>
            Switch between TikTok, Instagram, Facebook, YouTube, and X via Edit.
          </div>
        </div>
      )}

      {tab === "packs" && (
        <LinkedList
          loading={loading}
          empty={packs.length === 0}
          emptyIcon={Package}
          emptyMsg={`No content packs tagged "${workspace.niche}" yet.`}
          emptySub="Generate packs with the same niche to link them here."
        >
          {packs.map(p => (
            <div key={p.id} className="luxury-card p-4 space-y-2">
              <p className="text-sm font-medium text-foreground line-clamp-2">{p.hook}</p>
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">{p.platform}</span>
                <span>{p.tone}</span>
                <span className="ml-auto font-mono">{new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </LinkedList>
      )}

      {tab === "vault" && (
        <LinkedList
          loading={loading}
          empty={vault.length === 0}
          emptyIcon={Database}
          emptyMsg={`No vault entries tagged "${workspace.niche}" yet.`}
          emptySub="Save content to the vault with this niche to link them here."
        >
          {vault.map(e => (
            <div key={e.id} className="luxury-card p-4 space-y-2">
              <p className="text-sm font-medium text-foreground line-clamp-1">{e.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{e.content}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">{e.type}</span>
                <span className="ml-auto font-mono">{new Date(e.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </LinkedList>
      )}

      {tab === "calendar" && (
        <LinkedList
          loading={loading}
          empty={posts.length === 0}
          emptyIcon={CalendarDays}
          emptyMsg={`No calendar posts tagged "${workspace.niche}" yet.`}
          emptySub="Schedule posts with this niche in Content Calendar to link them here."
        >
          {posts.map(p => (
            <div key={p.id} className="luxury-card p-4 space-y-2">
              <p className="text-sm font-medium text-foreground line-clamp-1">{p.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">{p.status}</span>
                <span>{p.scheduledDay}</span>
              </div>
            </div>
          ))}
        </LinkedList>
      )}
    </div>
  );
}

function LinkedList({
  loading, empty, emptyIcon: Icon, emptyMsg, emptySub, children,
}: {
  loading: boolean; empty: boolean;
  emptyIcon: React.ElementType; emptyMsg: string; emptySub: string;
  children: React.ReactNode;
}) {
  if (loading)
    return <div className="luxury-card p-8 text-center text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin inline mr-2" />Loading…</div>;
  if (empty)
    return (
      <div className="luxury-card p-10 flex flex-col items-center gap-3 text-center">
        <Icon className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{emptyMsg}</p>
        <p className="text-xs text-muted-foreground/60">{emptySub}</p>
      </div>
    );
  return <div className="space-y-3">{children}</div>;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="luxury-card p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-primary/10 rounded w-3/4" />
          <div className="h-2.5 bg-primary/5 rounded w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[0,1,2,3].map(i => <div key={i} className="h-8 bg-primary/5 rounded" />)}
      </div>
      <div className="flex gap-2">
        {[0,1,2].map(i => <div key={i} className={cn("h-11 rounded-lg bg-primary/5", i === 0 ? "flex-1" : "w-14")} />)}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate]  = useLocation();
  const { activeWorkspace, setActiveWorkspace } = useActiveWorkspace();

  const [view, setView]           = useState<PageView>("list");
  const [workspaces, setWorkspaces] = useState<TikTokWorkspace[]>([]);
  const [stats, setStats]           = useState<WorkspaceStats>({ workspaces: 0, contentPacks: 0, vaultEntries: 0, calendarPosts: 0 });
  const [selected, setSelected]     = useState<TikTokWorkspace | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving]           = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [saveError, setSaveError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadingData(true);
    const [ws, s] = await Promise.all([
      fetchWorkspacesFromCloud(),
      fetchWorkspaceStatsFromCloud(),
    ]);
    setWorkspaces(ws);
    setStats(s);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const handleSave = async (form: FormState) => {
    setSaving(true);
    setSaveError(null);
    const isEdit = view === "edit" && selected !== null;
    const workspace: TikTokWorkspace = {
      id:        isEdit ? selected!.id : crypto.randomUUID(),
      userId:    null,
      createdAt: isEdit ? selected!.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...form,
    };
    const ok = await upsertWorkspaceToCloud(workspace);
    if (ok) {
      await load();
      if (activeWorkspace?.id === workspace.id) setActiveWorkspace(workspace);
      setView("list");
      toast({
        title: isEdit ? "Workspace updated" : "Workspace created",
        description: `"${workspace.workspaceName}" saved to your account.`,
      });
    } else {
      setSaveError("Save failed. Make sure you are signed in and the workspace table exists.");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const ok = await deleteWorkspaceFromCloud(id);
    if (ok) {
      if (activeWorkspace?.id === id) setActiveWorkspace(null);
      setWorkspaces(prev => prev.filter(w => w.id !== id));
      setStats(s => ({ ...s, workspaces: Math.max(0, s.workspaces - 1) }));
      toast({ title: "Workspace deleted" });
    } else {
      toast({ title: "Delete failed", description: "Please try again.", variant: "destructive" });
    }
    setDeletingId(null);
  };

  const openEdit = (w: TikTokWorkspace) => {
    setSelected(w);
    setSaveError(null);
    setView("edit");
  };

  const openDetail = (w: TikTokWorkspace) => {
    setSelected(w);
    setActiveWorkspace(w);
    setView("detail");
  };

  // ── Auth guard ─────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <RefreshCw className="h-5 w-5 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-sm mx-auto mt-16 text-center space-y-5">
        <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <Briefcase className="h-7 w-7 text-primary/60" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-foreground">Sign in to use Workspaces</h2>
          <p className="text-sm text-muted-foreground">Workspaces sync to your account and are accessible from any device.</p>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition min-h-[44px]"
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </button>
      </div>
    );
  }

  // ── View routing ───────────────────────────────────────────────────────────

  if (view === "create") {
    return (
      <WorkspaceForm
        initial={emptyForm()}
        onSave={handleSave}
        onCancel={() => setView("list")}
        saving={saving}
        error={saveError}
        mode="create"
      />
    );
  }

  if (view === "edit" && selected) {
    return (
      <WorkspaceForm
        initial={{
          workspaceName:    selected.workspaceName,
          accountName:      selected.accountName,
          username:         selected.username,
          platform:         selected.platform,
          niche:            selected.niche,
          audience:         selected.audience,
          goal:             selected.goal,
          postingFrequency: selected.postingFrequency,
          status:           selected.status,
          notes:            selected.notes,
        }}
        onSave={handleSave}
        onCancel={() => setView("list")}
        saving={saving}
        error={saveError}
        mode="edit"
      />
    );
  }

  if (view === "detail" && selected) {
    return (
      <WorkspaceDetail
        workspace={selected}
        onBack={() => setView("list")}
        onEdit={() => openEdit(selected)}
      />
    );
  }

  // ── List view (default) ────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold font-serif luxury-gradient-text">TikTok Workspace</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your social accounts, strategy, and linked content in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loadingData}
            title="Refresh"
            className="p-2.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <RefreshCw className={cn("h-4 w-4", loadingData && "animate-spin")} />
          </button>
          <button
            onClick={() => { setSaveError(null); setView("create"); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            New Workspace
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Briefcase}    label="Workspaces"     value={loadingData ? "…" : stats.workspaces}    />
        <StatCard icon={Package}      label="Content Packs"  value={loadingData ? "…" : stats.contentPacks}  />
        <StatCard icon={Database}     label="Vault Entries"  value={loadingData ? "…" : stats.vaultEntries}  />
        <StatCard icon={CalendarDays} label="Calendar Posts" value={loadingData ? "…" : stats.calendarPosts} />
      </div>

      {loadingData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="luxury-card p-12 flex flex-col items-center gap-5 text-center border-dashed">
          <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Briefcase className="h-7 w-7 text-primary/60" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">No workspaces yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Create your first workspace to organise your TikTok account strategy, content, and schedule in one place.
            </p>
          </div>
          <button
            onClick={() => { setSaveError(null); setView("create"); }}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            Create First Workspace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workspaces.map(w => (
            <WorkspaceCard
              key={w.id}
              workspace={w}
              onEdit={() => openEdit(w)}
              onDelete={() => handleDelete(w.id)}
              onOpen={() => openDetail(w)}
              deleting={deletingId === w.id}
              isActive={activeWorkspace?.id === w.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
