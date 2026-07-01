import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Target, Zap, Film, Users, Bot,
  Sparkles, Activity, CalendarDays, BarChart3, Database,
  Package, UserCircle, Briefcase, UserCheck2,
  LogIn, LogOut, Menu, X, Search, Settings,
  User, Key, CreditCard, HelpCircle, ChevronUp, Crown, Radio, Layers,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SyncStatusBar } from "@/components/SyncStatus";
import { useSync } from "@/hooks/useSync";
import { useAuth } from "@/lib/auth";
import { GlobalSearch } from "@/components/GlobalSearch";
import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { AppFooter } from "@/components/Footer";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/brief",        label: "Executive Brief",        icon: Crown           },
  { href: "/research",     label: "Research Command",       icon: Radio           },
  { href: "/pipeline",     label: "Intelligence Pipeline",  icon: Layers          },
  { href: "/",             label: "Dashboard",              icon: LayoutDashboard },
  { href: "/niche",        label: "Niche Intelligence",     icon: Target          },
  { href: "/hooks",        label: "Viral Hooks",            icon: Zap             },
  { href: "/prompts",      label: "Prompt Vault",           icon: Film            },
  { href: "/competitors",  label: "Competitors",            icon: Users           },
  { href: "/automation",   label: "AI Automation",          icon: Bot             },
  { href: "/generator",    label: "AI Content Generator",   icon: Sparkles        },
  { href: "/vault",        label: "Intelligence Vault",     icon: Database        },
  { href: "/calendar",     label: "Content Calendar",       icon: CalendarDays    },
  { href: "/analytics",    label: "Analytics Intelligence", icon: BarChart3       },
  { href: "/usage",        label: "Usage Tracker",          icon: Activity        },
  { href: "/content-pack", label: "Content Pack Generator", icon: Package         },
  { href: "/workspace",    label: "TikTok Workspace",       icon: Briefcase       },
  { href: "/accounts",     label: "TikTok Accounts",        icon: UserCheck2      },
  { href: "/profile",      label: "User Profile",           icon: UserCircle      },
];

// ── User dropdown ─────────────────────────────────────────────────────────

function UserDropdown({ onNavigate }: { onNavigate: (href: string) => void }) {
  const { user, loading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    onNavigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="h-9 w-9 rounded-full bg-primary/10 animate-pulse" />
        <div className="flex flex-col gap-1">
          <div className="h-3 w-24 bg-primary/10 rounded animate-pulse" />
          <div className="h-2 w-16 bg-primary/5 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Link href="/login">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer">
          <LogIn className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary tracking-wide">Sign In</span>
        </div>
      </Link>
    );
  }

  const initials   = user.email ? user.email.slice(0, 2).toUpperCase() : "EL";
  const shortEmail = user.email && user.email.length > 22
    ? user.email.slice(0, 20) + "…"
    : (user.email ?? "");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary/30 transition-colors group focus:outline-none focus-visible:ring-1 focus-visible:ring-primary">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-primary/20 p-[1px] flex-shrink-0">
            <div className="h-full w-full rounded-full bg-sidebar flex items-center justify-center">
              <span className="font-serif text-xs font-bold text-primary">{initials}</span>
            </div>
          </div>
          <div className="flex flex-col min-w-0 text-left flex-1">
            <span className="text-xs font-semibold text-foreground truncate">{shortEmail}</span>
            <span className="text-[10px] text-muted-foreground font-mono">Authenticated</span>
          </div>
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 group-hover:text-primary/60 transition-colors" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-52 bg-popover border-border shadow-xl"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-semibold text-foreground truncate">{user.email}</p>
            <p className="text-[10px] text-muted-foreground font-mono">Luxury Creator Plan</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onNavigate("/profile")} className="gap-2 cursor-pointer">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNavigate("/settings")} className="gap-2 cursor-pointer">
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNavigate("/settings#api-keys")} className="gap-2 cursor-pointer">
          <Key className="h-3.5 w-3.5 text-muted-foreground" />
          <span>API Keys</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="gap-2 opacity-50 cursor-not-allowed">
          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Billing</span>
          <span className="ml-auto text-[9px] text-muted-foreground/50 font-mono uppercase tracking-wider">Soon</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="gap-2 opacity-50 cursor-not-allowed">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Help</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={signingOut}
          className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{signingOut ? "Signing out…" : "Sign Out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const sync = useSync();

  // Cmd+K / Ctrl+K → open search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleNavigate = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden selection:bg-primary/30">

      {/* Global Search */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" onClick={() => setSidebarOpen(false)}>
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="font-serif font-bold text-xl tracking-widest text-primary hover:opacity-80 transition-opacity select-none">TLIS</div>
            <div className="h-4 w-[1px] bg-primary/30" />
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              <div className="live-dot" />
              <span className="text-[10px] uppercase tracking-wider text-primary font-medium">System Online</span>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
            className="h-9 w-9"
          >
            <Search className="h-4 w-4 text-primary" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu">
            {sidebarOpen ? <X className="h-5 w-5 text-primary" /> : <Menu className="h-5 w-5 text-primary" />}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out md:translate-x-0 md:static flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        {/* Sidebar header */}
        <div className="p-6 hidden md:block">
          <div className="flex items-center gap-3 mb-5">
            <Link href="/">
              <div className="font-serif font-bold text-3xl tracking-widest luxury-gradient-text cursor-pointer hover:opacity-80 transition-opacity select-none">
                TLIS
              </div>
            </Link>
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-md bg-black/40 border border-primary/20 shadow-inner">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Status</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-primary">SECURE</span>
              <div className="live-dot" />
            </div>
          </div>
        </div>

        {/* Search trigger */}
        <div className="px-4 mb-3 hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/10 hover:border-primary/30 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-xs flex-1 text-left">Search everything…</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[9px] font-mono text-muted-foreground/50 border border-muted/30 rounded px-1 py-0.5">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 py-4 md:py-0 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
          {navItems.map(item => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  onClick={() => setSidebarOpen(false)}
                  role="menuitem"
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer relative overflow-hidden group",
                    isActive
                      ? "text-primary bg-primary/10 border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary rounded-r" />}
                  <item.icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isActive ? "text-primary" : "opacity-70 group-hover:opacity-100 group-hover:text-primary transition-colors",
                    )}
                  />
                  <span className="tracking-wide truncate">{item.label}</span>
                </div>
              </Link>
            );
          })}

          {/* Settings link in nav */}
          <Link href="/settings">
            <div
              onClick={() => setSidebarOpen(false)}
              role="menuitem"
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer relative overflow-hidden group",
                location === "/settings"
                  ? "text-primary bg-primary/10 border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              {location === "/settings" && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary rounded-r" />}
              <Settings className={cn("h-4 w-4 flex-shrink-0", location === "/settings" ? "text-primary" : "opacity-70 group-hover:opacity-100 group-hover:text-primary transition-colors")} />
              <span className="tracking-wide">Settings</span>
            </div>
          </Link>
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 mt-auto border-t border-sidebar-border bg-black/20 space-y-3">
          <SyncStatusBar
            status={sync.status}
            lastSynced={sync.lastSynced}
            isConnected={sync.isConnected}
            error={sync.error}
          />
          <UserDropdown onNavigate={handleNavigate} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-[100dvh] md:h-screen">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none h-64" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 relative z-10 scroll-smooth">
          <div className="max-w-7xl mx-auto flex flex-col min-h-full">
            <AppBreadcrumb />
            <div className="flex-1">
              {children}
            </div>
            <AppFooter />
          </div>
        </div>
      </main>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
