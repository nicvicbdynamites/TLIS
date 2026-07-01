import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Briefcase, UserCheck2, Database, CalendarDays, Package,
  ArrowRight,
} from "lucide-react";
import {
  fetchWorkspacesFromCloud,
  fetchAccountsFromCloud,
  fetchVaultEntriesFromCloud,
  fetchCalendarFromCloud,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface SearchResult {
  id:       string;
  type:     "workspace" | "account" | "vault" | "calendar";
  title:    string;
  subtitle: string;
  href:     string;
}

const TYPE_ICON = {
  workspace: Briefcase,
  account:   UserCheck2,
  vault:     Database,
  calendar:  CalendarDays,
};

const TYPE_LABEL = {
  workspace: "Workspaces",
  account:   "TikTok Accounts",
  vault:     "Intelligence Vault",
  calendar:  "Calendar Posts",
};

export function GlobalSearch({
  open,
  onClose,
}: {
  open:    boolean;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const [allResults, setAllResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading]       = useState(false);
  const [query, setQuery]           = useState("");

  useEffect(() => {
    if (open && allResults === null && !loading) {
      setLoading(true);
      Promise.all([
        fetchWorkspacesFromCloud(),
        fetchAccountsFromCloud(),
        fetchVaultEntriesFromCloud(),
        fetchCalendarFromCloud(),
      ]).then(([workspaces, accounts, vault, calendar]) => {
        const results: SearchResult[] = [
          ...workspaces.map(w => ({
            id:       w.id,
            type:     "workspace" as const,
            title:    w.workspaceName,
            subtitle: `@${w.username} · ${w.niche}`,
            href:     "/workspace",
          })),
          ...accounts.map(a => ({
            id:       a.id,
            type:     "account" as const,
            title:    a.accountName,
            subtitle: `@${a.username} · ${a.status}`,
            href:     "/accounts",
          })),
          ...vault.slice(0, 100).map(v => ({
            id:       v.id,
            type:     "vault" as const,
            title:    v.title || v.content.slice(0, 60),
            subtitle: `${v.type} · ${v.niche}`,
            href:     "/vault",
          })),
          ...calendar.slice(0, 50).map(c => ({
            id:       c.id,
            type:     "calendar" as const,
            title:    c.title,
            subtitle: `${c.status} · ${c.scheduledDay}`,
            href:     "/calendar",
          })),
        ];
        setAllResults(results);
        setLoading(false);
      }).catch(() => {
        setAllResults([]);
        setLoading(false);
      });
    }
  }, [open, allResults, loading]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    if (!allResults) return {};
    const q = query.toLowerCase().trim();
    const matches = q
      ? allResults.filter(r =>
          r.title.toLowerCase().includes(q) ||
          r.subtitle.toLowerCase().includes(q),
        )
      : allResults.slice(0, 24);

    return matches.reduce<Partial<Record<SearchResult["type"], SearchResult[]>>>(
      (acc, r) => {
        if (!acc[r.type]) acc[r.type] = [];
        acc[r.type]!.push(r);
        return acc;
      },
      {},
    );
  }, [allResults, query]);

  const types = (["workspace", "account", "vault", "calendar"] as const).filter(
    t => (filtered[t]?.length ?? 0) > 0,
  );

  const handleSelect = (href: string) => {
    navigate(href);
    onClose();
  };

  return (
    <CommandDialog open={open} onOpenChange={onClose}>
      <CommandInput
        placeholder="Search workspaces, accounts, vault, calendar…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Loading…
          </div>
        )}
        {!loading && types.length === 0 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
        {types.map((type, i) => {
          const Icon = TYPE_ICON[type];
          return (
            <div key={type}>
              {i > 0 && <CommandSeparator />}
              <CommandGroup heading={TYPE_LABEL[type]}>
                {filtered[type]!.slice(0, 6).map(result => (
                  <CommandItem
                    key={result.id}
                    value={`${result.type}-${result.title}-${result.subtitle}`}
                    onSelect={() => handleSelect(result.href)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>

      {/* Keyboard hint */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/10">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span><kbd className="px-1.5 py-0.5 rounded border border-muted/50 font-mono bg-muted/20">↑↓</kbd> navigate</span>
          <span><kbd className="px-1.5 py-0.5 rounded border border-muted/50 font-mono bg-muted/20">↵</kbd> select</span>
          <span><kbd className="px-1.5 py-0.5 rounded border border-muted/50 font-mono bg-muted/20">esc</kbd> close</span>
        </div>
        <span className="text-[10px] text-muted-foreground/50 font-mono">⌘K</span>
      </div>
    </CommandDialog>
  );
}
