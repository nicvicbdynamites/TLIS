import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Target, 
  Zap, 
  Film, 
  Users, 
  Bot,
  Sparkles,
  Activity,
  CalendarDays,
  BarChart3,
  Database,
  Package,
  UserCircle,
  Briefcase,
  LogIn,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SyncStatusBar } from "@/components/SyncStatus";
import { useSync } from "@/hooks/useSync";
import { useAuth } from "@/lib/auth";

const navItems = [
  { href: "/",            label: "Dashboard",              icon: LayoutDashboard },
  { href: "/niche",       label: "Niche Intelligence",     icon: Target          },
  { href: "/hooks",       label: "Viral Hooks",            icon: Zap             },
  { href: "/prompts",     label: "Prompt Vault",           icon: Film            },
  { href: "/competitors", label: "Competitors",            icon: Users           },
  { href: "/automation",  label: "AI Automation",          icon: Bot             },
  { href: "/generator",   label: "AI Content Generator",   icon: Sparkles        },
  { href: "/vault",       label: "Intelligence Vault",     icon: Database        },
  { href: "/calendar",    label: "Content Calendar",       icon: CalendarDays    },
  { href: "/analytics",   label: "Analytics Intelligence", icon: BarChart3       },
  { href: "/usage",       label: "Usage Tracker",          icon: Activity        },
  { href: "/content-pack", label: "Content Pack Generator", icon: Package        },
  { href: "/workspace",   label: "TikTok Workspace",       icon: Briefcase       },
  { href: "/profile",     label: "User Profile",           icon: UserCircle      },
];

function UserSection() {
  const { user, loading, signOut } = useAuth();
  const [, navigate] = useLocation();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="h-10 w-10 rounded-full bg-primary/10 animate-pulse" />
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

  const initials = user.email
    ? user.email.slice(0, 2).toUpperCase()
    : "EL";
  const shortEmail = user.email && user.email.length > 22
    ? user.email.slice(0, 20) + "…"
    : (user.email ?? "");

  return (
    <div className="space-y-2">
      <Link href="/profile">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer group">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-primary/20 p-[1px] flex-shrink-0">
            <div className="h-full w-full rounded-full bg-sidebar flex items-center justify-center">
              <span className="font-serif text-xs font-bold text-primary">{initials}</span>
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">{shortEmail}</span>
            <span className="text-[10px] text-muted-foreground font-mono">Authenticated</span>
          </div>
        </div>
      </Link>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all disabled:opacity-50"
      >
        <LogOut className="h-3 w-3" />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sync = useSync();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden selection:bg-primary/30">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="font-serif font-bold text-xl tracking-widest text-primary">TLIS</div>
          <div className="h-4 w-[1px] bg-primary/30"></div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
            <div className="live-dot" />
            <span className="text-[10px] uppercase tracking-wider text-primary font-medium">System Online</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5 text-primary" /> : <Menu className="h-5 w-5 text-primary" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out md:translate-x-0 md:static flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden md:block">
          <div className="flex items-center gap-3 mb-8">
            <div className="font-serif font-bold text-3xl tracking-widest luxury-gradient-text">TLIS</div>
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-md bg-black/40 border border-primary/20 shadow-inner">
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Status</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-primary">SECURE</span>
              <div className="live-dot" />
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 md:py-0 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div 
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer relative overflow-hidden group",
                    isActive 
                      ? "text-primary bg-primary/10 border border-primary/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary rounded-r" />
                  )}
                  <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "opacity-70 group-hover:opacity-100 group-hover:text-primary transition-colors")} />
                  <span className="tracking-wide">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-sidebar-border bg-black/20 space-y-3">
          <SyncStatusBar
            status={sync.status}
            lastSynced={sync.lastSynced}
            isConnected={sync.isConnected}
            error={sync.error}
          />
          <UserSection />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-[100dvh] md:h-screen">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none h-64" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 relative z-10 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
      
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
