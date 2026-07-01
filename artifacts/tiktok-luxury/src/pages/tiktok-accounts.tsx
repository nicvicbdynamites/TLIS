import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "wouter";
import {
  UserCheck2, Plus, Search, X, Edit3, Trash2, ChevronDown,
  Globe, Clock, Mail, Phone, MapPin, AtSign, ShieldCheck,
  ShieldOff, Eye, EyeOff, Briefcase, Check, AlertTriangle,
  RefreshCw, Users,
} from "lucide-react";
import {
  fetchAccountsFromCloud,
  upsertAccountToCloud,
  deleteAccountFromCloud,
  fetchWorkspacesFromCloud,
  type TikTokAccount,
  type TikTokWorkspace,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Spain", "Italy", "Brazil", "Mexico", "Japan", "South Korea",
  "India", "Philippines", "Indonesia", "Thailand", "Vietnam", "Malaysia",
  "Singapore", "United Arab Emirates", "Saudi Arabia", "Nigeria",
  "South Africa", "Argentina", "Colombia", "Netherlands", "Sweden",
  "Poland", "Turkey", "Egypt",
];

const TIMEZONES = [
  "UTC-12:00 (Baker Island)",
  "UTC-10:00 (Hawaii)",
  "UTC-08:00 (Los Angeles / PST)",
  "UTC-07:00 (Denver / MST)",
  "UTC-06:00 (Chicago / CST)",
  "UTC-05:00 (New York / EST)",
  "UTC-04:00 (Atlantic / AST)",
  "UTC-03:00 (São Paulo / BRT)",
  "UTC+00:00 (London / GMT)",
  "UTC+01:00 (Paris / CET)",
  "UTC+02:00 (Cairo / EET)",
  "UTC+03:00 (Moscow / Riyadh)",
  "UTC+04:00 (Dubai / GST)",
  "UTC+05:30 (Mumbai / IST)",
  "UTC+07:00 (Bangkok / WIB)",
  "UTC+08:00 (Singapore / HKT)",
  "UTC+09:00 (Tokyo / KST)",
  "UTC+10:00 (Sydney / AEST)",
  "UTC+12:00 (Auckland / NZST)",
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Portuguese", "Japanese",
  "Korean", "Chinese (Simplified)", "Chinese (Traditional)", "Arabic",
  "Hindi", "Indonesian", "Thai", "Vietnamese", "Tagalog", "Malay",
  "Dutch", "Italian", "Swedish", "Polish", "Turkish",
];

const STATUS_OPTIONS = [
  { value: "active",    label: "Active"    },
  { value: "inactive",  label: "Inactive"  },
  { value: "suspended", label: "Suspended" },
  { value: "pending",   label: "Pending"   },
] as const;

const STATUS_STYLES: Record<TikTokAccount["status"], string> = {
  active:    "text-primary border-primary/30 bg-primary/10",
  inactive:  "text-muted-foreground border-muted/40 bg-muted/10",
  suspended: "text-rose-400 border-rose-400/30 bg-rose-400/10",
  pending:   "text-amber-400 border-amber-400/30 bg-amber-400/10",
};

const STATUS_DOT: Record<TikTokAccount["status"], string> = {
  active:    "bg-primary",
  inactive:  "bg-muted-foreground",
  suspended: "bg-rose-400",
  pending:   "bg-amber-400",
};

const STATUS_BAR: Record<TikTokAccount["status"], string> = {
  active:    "bg-primary",
  inactive:  "bg-muted-foreground/50",
  suspended: "bg-rose-400",
  pending:   "bg-amber-400",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return "Just now";
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)   return `${days}d ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
        <UserCheck2 className="h-7 w-7 text-primary/60" />
      </div>
      <h3 className="font-serif text-xl font-bold text-foreground mb-2">No TikTok Accounts</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
        Add your TikTok accounts to manage credentials, track statuses, and link them to your workspaces.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-black text-sm font-semibold hover:bg-primary/90 transition-all"
      >
        <Plus className="h-4 w-4" />
        Add First Account
      </button>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TikTokAccount["status"] }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
      STATUS_STYLES[status],
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
      {status}
    </span>
  );
}

// ── Account card ───────────────────────────────────────────────────────────

function AccountCard({
  account,
  workspaceName,
  onEdit,
  onDelete,
}: {
  account:       TikTokAccount;
  workspaceName: string | null;
  onEdit:        () => void;
  onDelete:      () => void;
}) {
  return (
    <div className={cn(
      "luxury-card relative overflow-hidden group transition-all duration-200",
      "hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5",
    )}>
      {/* Status accent bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", STATUS_BAR[account.status])} />

      <div className="p-4 pl-5 space-y-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground text-sm leading-tight truncate">
              {account.accountName}
            </p>
            {account.username && (
              <p className="text-xs text-primary font-mono mt-0.5 truncate">
                @{account.username.replace(/^@/, "")}
              </p>
            )}
          </div>
          <StatusBadge status={account.status} />
        </div>

        {/* Workspace label */}
        {workspaceName && (
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate">{workspaceName}</span>
          </div>
        )}

        {/* Contact info */}
        <div className="space-y-1">
          {account.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">{account.email}</span>
            </div>
          )}
          {account.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[11px] text-muted-foreground">{account.phone}</span>
            </div>
          )}
        </div>

        {/* Location row */}
        {(account.country || account.timezone) && (
          <div className="flex items-center gap-3 flex-wrap">
            {account.country && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-[11px] text-muted-foreground/80">{account.country}</span>
              </div>
            )}
            {account.timezone && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-[11px] text-muted-foreground/80 font-mono">
                  {account.timezone.split(" ")[0]}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Credentials indicator */}
        <div className="flex items-center gap-1.5">
          {account.hasPassword ? (
            <>
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span className="text-[11px] text-emerald-400">Credentials saved</span>
            </>
          ) : (
            <>
              <ShieldOff className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-[11px] text-muted-foreground/60">No credentials</span>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-[10px] text-muted-foreground font-mono">
            Updated {formatDate(account.updatedAt)}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              title="Edit"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded hover:bg-rose-400/10 text-muted-foreground hover:text-rose-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Form panel ─────────────────────────────────────────────────────────────

type FormData = Omit<TikTokAccount, "id" | "userId" | "createdAt" | "updatedAt">;

function emptyForm(): FormData {
  return {
    accountName: "",
    username:    "",
    email:       "",
    phone:       "",
    country:     "",
    timezone:    "",
    language:    "",
    workspaceId: null,
    status:      "active",
    notes:       "",
    hasPassword: false,
  };
}

function FormField({
  label, children, required,
}: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5 font-medium">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-muted/20 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-muted/30 transition-all";
const selectCls = inputCls + " appearance-none cursor-pointer pr-8";

function FormPanel({
  open,
  mode,
  initial,
  workspaces,
  saving,
  onClose,
  onSave,
}: {
  open:       boolean;
  mode:       "create" | "edit";
  initial:    FormData;
  workspaces: TikTokWorkspace[];
  saving:     boolean;
  onClose:    () => void;
  onSave:     (data: FormData, passwordText: string) => void;
}) {
  const [form, setForm]           = useState<FormData>(initial);
  const [passwordText, setPasswordText] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => { setForm(initial); setPasswordText(""); setError(""); }, [initial]);

  const set = (k: keyof FormData, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountName.trim()) { setError("Account name is required."); return; }
    setError("");
    onSave(form, passwordText);
  };

  return (
    <>
      {/* Backdrop — mobile only */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div className={cn(
        "fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-sidebar border-l border-sidebar-border",
        "flex flex-col shadow-2xl transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full",
      )}>
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-serif text-lg font-bold text-foreground">
              {mode === "create" ? "Add Account" : "Edit Account"}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-widest">
              TikTok Account Manager
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-5">

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-rose-400/10 border border-rose-400/30 text-rose-400 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Section: Identity */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Identity</span>
                <div className="h-[1px] flex-1 bg-border" />
              </div>

              <FormField label="Account Name" required>
                <input
                  value={form.accountName}
                  onChange={e => set("accountName", e.target.value)}
                  placeholder="e.g. Main Brand Account"
                  className={inputCls}
                />
              </FormField>

              <FormField label="TikTok Username">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <input
                    value={form.username}
                    onChange={e => set("username", e.target.value.replace(/^@/, ""))}
                    placeholder="yourhandle"
                    className={inputCls + " pl-7"}
                  />
                </div>
              </FormField>
            </div>

            {/* Section: Contact */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Contact</span>
                <div className="h-[1px] flex-1 bg-border" />
              </div>

              <FormField label="Email Address">
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  placeholder="account@email.com"
                  className={inputCls}
                />
              </FormField>

              <FormField label="Phone Number">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set("phone", e.target.value)}
                  placeholder="+1 555 000 0000"
                  className={inputCls}
                />
              </FormField>
            </div>

            {/* Section: Location */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Location</span>
                <div className="h-[1px] flex-1 bg-border" />
              </div>

              <FormField label="Country">
                <div className="relative">
                  <select
                    value={form.country}
                    onChange={e => set("country", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c} value={c} className="bg-card">{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </FormField>

              <FormField label="Timezone">
                <div className="relative">
                  <select
                    value={form.timezone}
                    onChange={e => set("timezone", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Select timezone</option>
                    {TIMEZONES.map(t => <option key={t} value={t} className="bg-card">{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </FormField>

              <FormField label="Language">
                <div className="relative">
                  <select
                    value={form.language}
                    onChange={e => set("language", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Select language</option>
                    {LANGUAGES.map(l => <option key={l} value={l} className="bg-card">{l}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </FormField>
            </div>

            {/* Section: Workspace & Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Workspace & Status</span>
                <div className="h-[1px] flex-1 bg-border" />
              </div>

              <FormField label="Linked Workspace">
                <div className="relative">
                  <select
                    value={form.workspaceId ?? ""}
                    onChange={e => set("workspaceId", e.target.value || null)}
                    className={selectCls}
                  >
                    <option value="">No workspace</option>
                    {workspaces.map(w => (
                      <option key={w.id} value={w.id} className="bg-card">
                        {w.workspaceName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </FormField>

              <FormField label="Status">
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("status", opt.value)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                        form.status === opt.value
                          ? STATUS_STYLES[opt.value] + " border-current"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full flex-shrink-0", form.status === opt.value ? STATUS_DOT[opt.value] : "bg-muted-foreground/40")} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>

            {/* Section: Security */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Security</span>
                <div className="h-[1px] flex-1 bg-border" />
              </div>

              <FormField label="Password / 2FA Reference">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordText}
                    onChange={e => setPasswordText(e.target.value)}
                    placeholder={form.hasPassword ? "Leave blank to keep existing" : "Enter to mark credentials as saved"}
                    className={inputCls + " pr-10"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground/70 mt-1.5 leading-relaxed">
                  Your actual password is <span className="text-primary font-medium">never stored</span>. Entering any value marks credentials as saved — display always shows ••••••••.
                </p>
              </FormField>

              {form.hasPassword && !passwordText && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-[11px] text-emerald-400">Credentials already marked as saved</span>
                </div>
              )}
            </div>

            {/* Section: Notes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Notes</span>
                <div className="h-[1px] flex-1 bg-border" />
              </div>

              <textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Account notes, login hints, 2FA method, recovery codes location…"
                rows={4}
                className={inputCls + " resize-none"}
              />
            </div>

          </div>
        </form>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0 bg-black/20">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-black text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Check className="h-4 w-4" /> {mode === "create" ? "Create Account" : "Save Changes"}</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Delete confirmation dialog ─────────────────────────────────────────────

function DeleteDialog({
  open,
  accountName,
  deleting,
  onCancel,
  onConfirm,
}: {
  open:        boolean;
  accountName: string;
  deleting:    boolean;
  onCancel:    () => void;
  onConfirm:   () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-card border border-card-border rounded-xl p-6 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-rose-400/10 border border-rose-400/30 flex items-center justify-center flex-shrink-0">
            <Trash2 className="h-4 w-4 text-rose-400" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">Delete Account</h3>
            <p className="text-[11px] text-muted-foreground">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-foreground mb-1">
          Delete <span className="font-semibold text-primary">{accountName}</span>?
        </p>
        <p className="text-xs text-muted-foreground mb-5">
          All account data will be permanently removed from Supabase.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
          >
            Keep Account
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-all disabled:opacity-50"
          >
            {deleting ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Deleting…</> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Auth gate ──────────────────────────────────────────────────────────────

function AuthGate() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
        <ShieldCheck className="h-7 w-7 text-primary/60" />
      </div>
      <h3 className="font-serif text-xl font-bold text-foreground mb-2">Authentication Required</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
        Sign in to manage your TikTok accounts. Your data is protected with Row-Level Security.
      </p>
      <Link href="/login">
        <button className="px-5 py-2.5 rounded-lg bg-primary text-black text-sm font-semibold hover:bg-primary/90 transition-all">
          Sign In
        </button>
      </Link>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function TikTokAccountsPage() {
  const { user, loading: authLoading } = useAuth();

  const [accounts,   setAccounts]   = useState<TikTokAccount[]>([]);
  const [workspaces, setWorkspaces] = useState<TikTokWorkspace[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  // Filter state
  const [search,    setSearch]    = useState("");
  const [statusFilter, setStatusFilter] = useState<TikTokAccount["status"] | "all">("all");
  const [wsFilter,  setWsFilter]  = useState<string>("all");

  // Panel / modal state
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [panelMode,  setPanelMode]  = useState<"create" | "edit">("create");
  const [formInitial, setFormInitial] = useState<FormData>(emptyForm());
  const [editingId,  setEditingId]  = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<TikTokAccount | null>(null);

  // Workspace name lookup
  const wsMap = useMemo<Map<string, string>>(
    () => new Map(workspaces.map(w => [w.id, w.workspaceName])),
    [workspaces],
  );

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    const [accs, wss] = await Promise.all([
      fetchAccountsFromCloud(),
      fetchWorkspacesFromCloud(),
    ]);
    setAccounts(accs);
    setWorkspaces(wss);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) loadData();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, loadData]);

  // Filtered accounts
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return accounts.filter(a => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (wsFilter !== "all" && a.workspaceId !== wsFilter)    return false;
      if (q) {
        return (
          a.accountName.toLowerCase().includes(q) ||
          a.username.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [accounts, search, statusFilter, wsFilter]);

  // Stats
  const stats = useMemo(() => ({
    total:     accounts.length,
    active:    accounts.filter(a => a.status === "active").length,
    inactive:  accounts.filter(a => a.status === "inactive").length,
    suspended: accounts.filter(a => a.status === "suspended").length,
    pending:   accounts.filter(a => a.status === "pending").length,
  }), [accounts]);

  // Open create panel
  const openCreate = () => {
    setEditingId(null);
    setFormInitial(emptyForm());
    setPanelMode("create");
    setPanelOpen(true);
  };

  // Open edit panel
  const openEdit = (a: TikTokAccount) => {
    setEditingId(a.id);
    setFormInitial({
      accountName: a.accountName,
      username:    a.username,
      email:       a.email,
      phone:       a.phone,
      country:     a.country,
      timezone:    a.timezone,
      language:    a.language,
      workspaceId: a.workspaceId,
      status:      a.status,
      notes:       a.notes,
      hasPassword: a.hasPassword,
    });
    setPanelMode("edit");
    setPanelOpen(true);
  };

  // Save handler
  const handleSave = async (data: FormData, passwordText: string) => {
    setSaving(true);
    const now = new Date().toISOString();
    const account: TikTokAccount = {
      id:          editingId ?? crypto.randomUUID(),
      userId:      null,
      createdAt:   now,
      updatedAt:   now,
      ...data,
      hasPassword: passwordText.length > 0 ? true : data.hasPassword,
    };
    const ok = await upsertAccountToCloud(account);
    if (ok) {
      setAccounts(prev => {
        const existing = prev.find(a => a.id === account.id);
        if (existing) return prev.map(a => a.id === account.id ? account : a);
        return [account, ...prev];
      });
      setPanelOpen(false);
    }
    setSaving(false);
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await deleteAccountFromCloud(deleteTarget.id);
    if (ok) {
      setAccounts(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <UserCheck2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Module 14</span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold luxury-gradient-text">
            TikTok Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage account credentials, statuses, and workspace links
          </p>
        </div>

        {user && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-black text-sm font-semibold hover:bg-primary/90 transition-all flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Account</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      {/* Auth gate */}
      {!authLoading && !user && <AuthGate />}

      {user && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total",     value: stats.total,     color: "text-foreground",          icon: Users       },
              { label: "Active",    value: stats.active,    color: "text-primary",             icon: UserCheck2  },
              { label: "Inactive",  value: stats.inactive,  color: "text-muted-foreground",    icon: ShieldOff   },
              { label: "Suspended", value: stats.suspended, color: "text-rose-400",            icon: AlertTriangle },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="luxury-card p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className={cn("text-xl font-serif font-bold", color)}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, username, or email…"
                className="w-full bg-muted/20 border border-border rounded-lg pl-9 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                className="appearance-none bg-muted/20 border border-border rounded-lg pl-3 pr-8 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 cursor-pointer min-w-[130px]"
              >
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value} className="bg-card">{s.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Workspace filter */}
            {workspaces.length > 0 && (
              <div className="relative">
                <select
                  value={wsFilter}
                  onChange={e => setWsFilter(e.target.value)}
                  className="appearance-none bg-muted/20 border border-border rounded-lg pl-3 pr-8 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 cursor-pointer min-w-[150px]"
                >
                  <option value="all">All Workspaces</option>
                  {workspaces.map(w => <option key={w.id} value={w.id} className="bg-card">{w.workspaceName}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            )}
          </div>

          {/* Results count */}
          {(search || statusFilter !== "all" || wsFilter !== "all") && (
            <p className="text-xs text-muted-foreground -mt-2">
              {filtered.length} {filtered.length === 1 ? "account" : "accounts"} found
              {(search || statusFilter !== "all" || wsFilter !== "all") && (
                <button
                  onClick={() => { setSearch(""); setStatusFilter("all"); setWsFilter("all"); }}
                  className="ml-2 text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </p>
          )}

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="luxury-card p-5 space-y-3 animate-pulse">
                  <div className="h-4 w-3/4 bg-primary/10 rounded" />
                  <div className="h-3 w-1/2 bg-muted/20 rounded" />
                  <div className="h-3 w-2/3 bg-muted/20 rounded" />
                  <div className="h-3 w-1/3 bg-muted/20 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 && accounts.length === 0 ? (
            <EmptyState onAdd={openCreate} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No accounts match your filters.</p>
              <button
                onClick={() => { setSearch(""); setStatusFilter("all"); setWsFilter("all"); }}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  workspaceName={account.workspaceId ? (wsMap.get(account.workspaceId) ?? null) : null}
                  onEdit={() => openEdit(account)}
                  onDelete={() => setDeleteTarget(account)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Form panel */}
      <FormPanel
        open={panelOpen}
        mode={panelMode}
        initial={formInitial}
        workspaces={workspaces}
        saving={saving}
        onClose={() => setPanelOpen(false)}
        onSave={handleSave}
      />

      {/* Delete dialog */}
      <DeleteDialog
        open={deleteTarget !== null}
        accountName={deleteTarget?.accountName ?? ""}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
