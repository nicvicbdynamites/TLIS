import { useState } from "react";
import {
  Settings, Palette, Bell, Key, User, Info,
  Shield, Moon, Sun, Laptop, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ id, icon: Icon, title, subtitle, children }: {
  id:       string;
  icon:     typeof Settings;
  title:    string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="luxury-card divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="text-sm text-foreground font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        checked ? "bg-primary border-primary" : "bg-muted/30 border-muted/50",
      )}
    >
      <span className={cn(
        "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-6" : "translate-x-1",
      )} />
    </button>
  );
}

function ThemeOption({ value, current, label, icon: Icon, onClick }: {
  value:   string;
  current: string;
  label:   string;
  icon:    typeof Sun;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-3 rounded-lg border transition",
        current === value
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-medium">{label}</span>
      {current === value && <Check className="h-3 w-3" />}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [notify, setNotify] = useState({
    generation:  true,
    sync:        true,
    errors:      true,
    marketing:   false,
    weeklyDigest: false,
  });
  const [theme, setTheme] = useState<"system" | "dark" | "light">("dark");
  const [language, setLanguage] = useState("en");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  const sections = [
    { id: "general",      icon: Settings, label: "General"            },
    { id: "appearance",   icon: Palette,  label: "Appearance"         },
    { id: "notifications",icon: Bell,     label: "Notifications"      },
    { id: "api-keys",     icon: Key,      label: "API Keys"           },
    { id: "account",      icon: User,     label: "Account Preferences"},
    { id: "version",      icon: Info,     label: "Version Info"       },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Page header */}
      <div className="flex items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Settings className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Module 14.5</span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold luxury-gradient-text">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure TLIS to match your workflow</p>
        </div>
      </div>

      {/* Quick jump nav */}
      <div className="flex flex-wrap gap-2">
        {sections.map(s => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition"
          >
            <s.icon className="h-3 w-3" />
            {s.label}
          </a>
        ))}
      </div>

      {/* ── General ── */}
      <Section id="general" icon={Settings} title="General" subtitle="Core application preferences">
        <Row label="Language" sub="Interface language">
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="bg-muted/20 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
          </select>
        </Row>
        <Row label="Content Density" sub="Compact or comfortable card spacing">
          <div className="flex items-center gap-2">
            {(["comfortable", "compact"] as const).map(d => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs border transition capitalize",
                  density === d
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/20",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Auto-save" sub="Save changes automatically as you type">
          <Toggle checked={true} onChange={() => {}} />
        </Row>
        <Row label="Analytics Tracking" sub="Help improve TLIS with anonymous usage data">
          <Toggle checked={false} onChange={() => {}} />
        </Row>
      </Section>

      {/* ── Appearance ── */}
      <Section id="appearance" icon={Palette} title="Appearance" subtitle="Visual theme and display preferences">
        <div className="px-5 py-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Theme</p>
          <div className="grid grid-cols-3 gap-3 max-w-xs">
            <ThemeOption value="dark"   current={theme} label="Dark"   icon={Moon}    onClick={() => setTheme("dark")}   />
            <ThemeOption value="light"  current={theme} label="Light"  icon={Sun}     onClick={() => setTheme("light")}  />
            <ThemeOption value="system" current={theme} label="System" icon={Laptop}  onClick={() => setTheme("system")} />
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-3">
            TLIS is designed for the dark luxury aesthetic. Light mode coming soon.
          </p>
        </div>
        <Row label="Sidebar Collapsed" sub="Start with sidebar minimised on desktop">
          <Toggle checked={false} onChange={() => {}} />
        </Row>
        <Row label="Reduced Motion" sub="Disable animations for accessibility">
          <Toggle checked={false} onChange={() => {}} />
        </Row>
      </Section>

      {/* ── Notifications ── */}
      <Section id="notifications" icon={Bell} title="Notifications" subtitle="Control what alerts you receive">
        <Row label="Generation Complete" sub="Toast when AI content generation finishes">
          <Toggle checked={notify.generation} onChange={() => setNotify(p => ({ ...p, generation: !p.generation }))} />
        </Row>
        <Row label="Sync Status" sub="Alerts when Supabase sync fails or succeeds">
          <Toggle checked={notify.sync} onChange={() => setNotify(p => ({ ...p, sync: !p.sync }))} />
        </Row>
        <Row label="Error Alerts" sub="Show errors and API failures as toasts">
          <Toggle checked={notify.errors} onChange={() => setNotify(p => ({ ...p, errors: !p.errors }))} />
        </Row>
        <Row label="Marketing Updates" sub="Product news and new feature announcements">
          <Toggle checked={notify.marketing} onChange={() => setNotify(p => ({ ...p, marketing: !p.marketing }))} />
        </Row>
        <Row label="Weekly Digest" sub="Summary of your TikTok performance each Monday">
          <Toggle checked={notify.weeklyDigest} onChange={() => setNotify(p => ({ ...p, weeklyDigest: !p.weeklyDigest }))} />
        </Row>
      </Section>

      {/* ── API Keys ── */}
      <Section id="api-keys" icon={Key} title="API Keys" subtitle="Manage integration credentials">
        <div className="px-5 py-4 space-y-4">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 text-xs text-muted-foreground leading-relaxed">
            <Shield className="h-3.5 w-3.5 text-primary inline mr-1.5" />
            API keys are stored as environment secrets and never exposed in the browser. To update a key, use the Replit Secrets panel.
          </div>
          {[
            { label: "Gemini API Key",     key: "GEMINI_API_KEY",     status: "Configured"    },
            { label: "Supabase URL",       key: "SUPABASE_URL",       status: "Configured"    },
            { label: "Supabase Anon Key",  key: "SUPABASE_ANON_KEY",  status: "Configured"    },
            { label: "TikTok API Key",     key: "TIKTOK_API_KEY",     status: "Not set"       },
            { label: "Stripe Secret Key",  key: "STRIPE_SECRET_KEY",  status: "Not set"       },
          ].map(({ label, key, status }) => (
            <div key={key} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
              <div>
                <p className="text-xs font-medium text-foreground">{label}</p>
                <p className="text-[10px] font-mono text-muted-foreground/60">{key}</p>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                status === "Configured"
                  ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                  : "text-muted-foreground border-muted/30 bg-muted/10",
              )}>
                {status}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Account Preferences ── */}
      <Section id="account" icon={User} title="Account Preferences" subtitle="Personal account settings">
        <Row label="Default Platform" sub="Pre-fill platform in generators">
          <select className="bg-muted/20 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50">
            <option>TikTok</option>
            <option>Instagram</option>
            <option>YouTube</option>
          </select>
        </Row>
        <Row label="Default Tone" sub="Starting tone for AI content generation">
          <select className="bg-muted/20 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50">
            <option>Aspirational</option>
            <option>Educational</option>
            <option>Entertaining</option>
            <option>Inspirational</option>
          </select>
        </Row>
        <Row label="Timezone" sub="Used for scheduling and calendar posts">
          <select className="bg-muted/20 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50">
            <option>UTC+00:00</option>
            <option>UTC-05:00 (EST)</option>
            <option>UTC-08:00 (PST)</option>
            <option>UTC+01:00 (CET)</option>
            <option>UTC+08:00 (SGT)</option>
          </select>
        </Row>
        <Row label="Public Profile" sub="Make your TLIS profile discoverable">
          <Toggle checked={false} onChange={() => {}} />
        </Row>
      </Section>

      {/* ── Version Info ── */}
      <Section id="version" icon={Info} title="Version Information" subtitle="Current build and module status">
        <div className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Version",       value: "v0.15.0 Beta"         },
              { label: "Build",         value: "Production"           },
              { label: "Node.js",       value: "24.x"                 },
              { label: "React",         value: "18.x"                 },
              { label: "TypeScript",    value: "5.9"                  },
              { label: "Supabase SDK",  value: "Latest"               },
            ].map(({ label, value }) => (
              <div key={label} className="bg-black/20 rounded-lg p-3 border border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-xs text-foreground font-mono mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Modules</p>
            <div className="space-y-1.5">
              {[
                "01 Niche Intelligence", "02 Viral Hooks", "03 Prompt Vault",
                "04 Competitors", "05 AI Automation", "06 AI Content Generator",
                "07 Intelligence Vault", "08 Content Calendar", "09 Analytics Intelligence",
                "10 Usage Tracker", "11 Content Pack Generator", "12 User Profile",
                "13 TikTok Workspace", "14 TikTok Accounts", "14.5 Application Shell",
              ].map(m => (
                <div key={m} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-xs text-muted-foreground font-mono">{m}</span>
                  <span className="ml-auto text-[10px] text-emerald-400 font-medium">✓ Active</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
