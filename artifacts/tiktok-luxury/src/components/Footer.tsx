export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto pt-12 pb-6 border-t border-border/40">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm tracking-widest luxury-gradient-text">TLIS</span>
            <span className="text-muted-foreground/40 text-xs">—</span>
            <span className="text-xs text-muted-foreground">TikTok Luxury Intelligence System</span>
          </div>
          <p className="text-[10px] text-muted-foreground/50 tracking-wider">
            Powered by{" "}
            <span className="text-primary/60 font-semibold uppercase tracking-widest">Integrations</span>
            {" · "}
            <span className="text-primary/60 font-semibold uppercase tracking-widest">Workflows</span>
            {" · "}
            <span className="text-primary/60 font-semibold uppercase tracking-widest">Dynamics</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary/70">
            v0.15.0 Beta
          </span>
          <span className="text-[10px] text-muted-foreground/40 font-mono">© {year}</span>
        </div>
      </div>
    </footer>
  );
}
