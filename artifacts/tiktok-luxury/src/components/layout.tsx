import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Target, Zap, Film, Users, Bot,
  Sparkles, Activity, CalendarDays, BarChart3, Database,
  Package, UserCircle, Briefcase, UserCheck2,
  LogIn, LogOut, Menu, X, Search, Settings,
  User, Key, CreditCard, HelpCircle, ChevronUp, ChevronDown, Crown, Radio, Layers, BrainCircuit, Plug, Monitor,
  ScrollText, HeartPulse, ShieldCheck, Bell, Compass, Star, Clock, Filter
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SyncStatusBar } from "@/components/SyncStatus";
import { useSync } from "@/hooks/useSync";
import { useAuth } from "@/lib/auth";
import { GlobalSearch } from "@/components/GlobalSearch";
import { AppBreadcrumb } from "@/components/AppBreadcrumb";
import { AppFooter } from "@/components/Footer";
import { NotificationCenter } from "@/components/notification-center";
import { getReviewCenterStats } from "@/lib/review-center-store";
import { getNotifications } from "@/lib/notifications-store";
import { fetchAccountsFromCloud } from "@/lib/supabase";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface NavItemDef {
  href: string;
  label: string;
  icon: React.ElementType;
  badgeKey?: "reviewCenter" | "notifications" | "accounts" | "health" | "campaigns" | "automation";
  badgeCustom?: string;
}

export interface NavSectionDef {
  title: string;
  collapsible?: boolean;
  items: NavItemDef[];
}

const NAV_SECTIONS: NavSectionDef[] = [
  {
    title: "Dashboard",
    items: [
      { href: "/",             label: "Dashboard",          icon: LayoutDashboard },
      { href: "/command",      label: "Executive Command",  icon: Monitor },
      { href: "/brief",        label: "Executive Brief",    icon: Crown },
      { href: "/notifications",label: "Notifications",      icon: Bell, badgeKey: "notifications" },
    ]
  },
  {
    title: "Campaign Operations",
    items: [
      { href: "/campaigns",    label: "Campaign Manager",  icon: Target, badgeKey: "campaigns" },
      { href: "/review-center", label: "Review Center",    icon: ShieldCheck, badgeKey: "reviewCenter" },
      { href: "/generator",     label: "Content Studio",    icon: Sparkles },
      { href: "/calendar",      label: "Content Calendar",  icon: CalendarDays },
    ]
  },
  {
    title: "AI Intelligence",
    collapsible: true,
    items: [
      { href: "/research",     label: "Research Command",      icon: Radio },
      { href: "/pipeline",     label: "Intelligence Pipeline", icon: Layers },
      { href: "/ai-engine",    label: "AI Intelligence Engine",icon: BrainCircuit },
      { href: "/niche",        label: "Niche Intelligence",    icon: Compass },
      { href: "/competitors",  label: "Competitors",           icon: Users },
      { href: "/hooks",        label: "Viral Hooks",           icon: Zap },
      { href: "/prompts",      label: "Prompt Library",        icon: Film },
      { href: "/vault",        label: "Intelligence Vault",    icon: Database },
    ]
  },
  {
    title: "Accounts",
    items: [
      { href: "/accounts",     label: "TikTok Accounts",  icon: UserCheck2, badgeKey: "accounts" },
      { href: "/workspace",    label: "TikTok Workspace", icon: Briefcase },
      { href: "/integrations", label: "Integration Hub",  icon: Plug },
    ]
  },
  {
    title: "Automation",
    items: [
      { href: "/automation",   label: "Automation Engine",       icon: Bot, badgeKey: "automation" },
      { href: "/content-pack", label: "Content Pack Generator", icon: Package },
    ]
  },
  {
    title: "Analytics",
    items: [
      { href: "/analytics",    label: "Analytics Intelligence", icon: BarChart3 },
      { href: "/usage",        label: "Usage Tracker",         icon: Activity },
      { href: "/platform-health", label: "Platform Health",    icon: HeartPulse, badgeKey: "health" },
      { href: "/audit-log",    label: "Audit Log",             icon: ScrollText },
    ]
  },
  {
    title: "Administration",
    items: [
      { href: "/profile",      label: "User Profile", icon: UserCircle },
      { href: "/settings",     label: "Settings",     icon: Settings },
    ]
  }
];

// Flat list for lookup
const ALL_NAV_ITEMS: NavItemDef[] = NAV_SECTIONS.flatMap(s => s.items);

const CLEAN_ITEMS: NavItemDef[] = ALL_NAV_ITEMS;
const FINAL_SECTIONS: NavSectionDef[] = NAV_SECTIONS;

// ── User dropdown ─────────────────────────────────────────────────────────

function UserDropdown({ onNavigate }: { onNavigate: (href: string) => void }) {
  const { user, loading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    onNavigate("/login");
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
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition cursor-pointer">
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
  const [filterQuery, setFilterQuery] = useState("");
  const sync = useSync();

  // Collapsed sections state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("tlis_nav_collapsed_v1");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("tlis_nav_favorites_v1");
      return saved ? JSON.parse(saved) : ["/review-center", "/campaigns"];
    } catch {
      return ["/review-center", "/campaigns"];
    }
  });

  // Recently visited routes state
  const [recentPages, setRecentPages] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("tlis_nav_recents_v1");
      return saved ? JSON.parse(saved) : ["/review-center", "/brief"];
    } catch {
      return ["/review-center", "/brief"];
    }
  });

  // Dynamic badge counts state
  const [badgeCounts, setBadgeCounts] = useState({
    reviewCenter: 0,
    notifications: 0,
    accounts: 0,
    campaigns: 2,
    automation: 2,
    health: "OK",
  });

  // Update badge values
  const refreshBadges = useCallback(async () => {
    const rc = getReviewCenterStats();
    const notifs = getNotifications();
    const unread = notifs.filter(n => !n.read).length;
    let accs = 1;
    try {
      const res = await fetchAccountsFromCloud();
      accs = res.length || 1;
    } catch {
      accs = 1;
    }

    setBadgeCounts({
      reviewCenter: rc.awaitingReview,
      notifications: unread,
      accounts: accs,
      campaigns: rc.draft + rc.awaitingReview + rc.scheduled,
      automation: 2,
      health: "OK",
    });
  }, []);

  useEffect(() => {
    refreshBadges();
    window.addEventListener("focus", refreshBadges);
    window.addEventListener("tlis_review_center_update", refreshBadges);
    window.addEventListener("tlis_notifications_update", refreshBadges);
    return () => {
      window.removeEventListener("focus", refreshBadges);
      window.removeEventListener("tlis_review_center_update", refreshBadges);
      window.removeEventListener("tlis_notifications_update", refreshBadges);
    };
  }, [refreshBadges]);

  // Track recently visited routes
  useEffect(() => {
    if (!location) return;
    setRecentPages(prev => {
      const filtered = prev.filter(p => p !== location);
      const updated = [location, ...filtered].slice(0, 4);
      try {
        localStorage.setItem("tlis_nav_recents_v1", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [location]);

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

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem("tlis_nav_collapsed_v1", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleFavorite = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href];
      try {
        localStorage.setItem("tlis_nav_favorites_v1", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleNavigate = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  // Favorited items lookup
  const favoriteItems = useMemo(() => {
    return CLEAN_ITEMS.filter(item => favorites.includes(item.href));
  }, [favorites]);

  // Recent items lookup
  const recentItems = useMemo(() => {
    return CLEAN_ITEMS.filter(item => recentPages.includes(item.href) && item.href !== location);
  }, [recentPages, location]);

  const renderBadge = (item: NavItemDef) => {
    if (!item.badgeKey) return null;
    let content: React.ReactNode = null;
    let style = "bg-primary/20 text-primary border-primary/30";

    if (item.badgeKey === "reviewCenter") {
      const val = badgeCounts.reviewCenter;
      if (val === 0) return null;
      content = val;
      style = "bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold";
    } else if (item.badgeKey === "notifications") {
      const val = badgeCounts.notifications;
      if (val === 0) return null;
      content = val;
      style = "bg-primary text-primary-foreground font-bold";
    } else if (item.badgeKey === "accounts") {
      content = badgeCounts.accounts;
      style = "bg-muted text-muted-foreground border-border";
    } else if (item.badgeKey === "campaigns") {
      content = `${badgeCounts.campaigns} Active`;
      style = "bg-primary/10 text-primary border-primary/20 text-[9px]";
    } else if (item.badgeKey === "automation") {
      content = `${badgeCounts.automation} Active`;
      style = "bg-chart-2/20 text-chart-2 border-chart-2/30 text-[9px]";
    } else if (item.badgeKey === "health") {
      content = "OK";
      style = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] font-bold";
    }

    return (
      <Badge className={cn("ml-auto text-[10px] px-1.5 py-0.2 min-w-[18px] justify-center", style)}>
        {content}
      </Badge>
    );
  };

  const renderNavItem = (item: NavItemDef) => {
    const isActive = location === item.href || (item.href === "/" && location === "/dashboard");
    const isFavorited = favorites.includes(item.href);

    return (
      <Link key={item.href} href={item.href}>
        <div
          onClick={() => setSidebarOpen(false)}
          role="menuitem"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer relative overflow-hidden group min-h-[38px]",
            isActive
              ? "text-primary bg-primary/10 border border-primary/30 shadow-[0_0_12px_hsl(44_54%_54%/0.1)]"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
          )}
        >
          {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r" />}
          <item.icon
            className={cn(
              "h-4 w-4 flex-shrink-0 transition-colors",
              isActive ? "text-primary" : "opacity-70 group-hover:opacity-100 group-hover:text-primary",
            )}
          />
          <span className="tracking-wide truncate flex-1">{item.label}</span>

          {renderBadge(item)}

          {/* Star Favorite toggle button */}
          <button
            onClick={(e) => toggleFavorite(item.href, e)}
            title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
            className={cn(
              "p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted/50 transition-all ml-1",
              isFavorited && "opacity-100 text-amber-400"
            )}
          >
            <Star className={cn("h-3 w-3", isFavorited ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
          </button>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden selection:bg-primary/30">

      {/* Global Search */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/95 sticky top-0 z-50">
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
        <div className="p-5 pb-3 hidden md:block">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/">
              <div className="font-serif font-bold text-2xl tracking-widest luxury-gradient-text cursor-pointer hover:opacity-80 transition-opacity select-none">
                TLIS OS
              </div>
            </Link>
            <Badge variant="outline" className="border-primary/30 text-primary text-[9px] font-mono ml-auto">
              v0.18
            </Badge>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-black/40 border border-primary/20 shadow-inner">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Mission Control</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-primary">ONLINE</span>
              <div className="live-dot" />
            </div>
          </div>
        </div>

        {/* Quick Filter & Global Search trigger */}
        <div className="px-4 mb-3">
          <div className="relative mb-2">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Filter modules..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-black/30 border border-border/80 rounded-lg focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ×
              </button>
            )}
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/10 hover:border-primary/30 hover:bg-primary/5 transition text-muted-foreground hover:text-foreground"
          >
            <Search className="h-3 w-3 flex-shrink-0" />
            <span className="text-[11px] flex-1 text-left">Global Search…</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[9px] font-mono text-muted-foreground/50 border border-muted/30 rounded px-1 py-0.2">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto custom-scrollbar" aria-label="Main navigation">
          
          {/* Favorites Section */}
          {!filterQuery && favoriteItems.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-widest text-amber-400/80 font-bold flex items-center gap-1.5">
                <Star className="h-3 w-3 fill-amber-400/80" />
                <span>Favorites</span>
              </div>
              <div className="space-y-0.5">
                {favoriteItems.map(item => renderNavItem(item))}
              </div>
            </div>
          )}

          {/* Filter Mode */}
          {filterQuery ? (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-widest text-primary font-semibold">
                Matching Modules ({CLEAN_ITEMS.filter(i => i.label.toLowerCase().includes(filterQuery.toLowerCase())).length})
              </div>
              {CLEAN_ITEMS
                .filter(i => i.label.toLowerCase().includes(filterQuery.toLowerCase()))
                .map(item => renderNavItem(item))}
            </div>
          ) : (
            /* Standard Grouped Sections */
            FINAL_SECTIONS.map(section => {
              const isCollapsed = section.collapsible && collapsedSections[section.title];
              return (
                <div key={section.title} className="space-y-1">
                  <div
                    onClick={() => section.collapsible && toggleSection(section.title)}
                    className={cn(
                      "flex items-center justify-between px-3 py-1.5 text-[10px] uppercase font-mono tracking-widest text-muted-foreground/70 font-bold select-none",
                      section.collapsible && "cursor-pointer hover:text-primary transition-colors"
                    )}
                  >
                    <span>{section.title}</span>
                    {section.collapsible && (
                      <button className="text-muted-foreground/50 hover:text-primary">
                        {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                      </button>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {section.items.map(item => renderNavItem(item))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Recent Section */}
          {!filterQuery && recentItems.length > 0 && (
            <div className="pt-2 border-t border-border/40 space-y-1">
              <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-widest text-muted-foreground/60 font-semibold flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Recently Visited</span>
              </div>
              <div className="space-y-0.5">
                {recentItems.map(item => (
                  <Link key={`recent-${item.href}`} href={item.href}>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition">
                      <item.icon className="h-3.5 w-3.5 opacity-60" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </nav>

        {/* Sidebar footer */}
        <div className="p-4 mt-auto border-t border-sidebar-border bg-black/30 space-y-3">
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
            <div className="flex items-center justify-between gap-4 mb-2">
              <AppBreadcrumb />
              <div className="ml-auto flex items-center gap-2 mb-3">
                <NotificationCenter />
              </div>
            </div>
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
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
