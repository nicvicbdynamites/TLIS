import { Switch, Route, Router as WouterRouter } from "wouter";
import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { AuthProvider } from "@/lib/auth";
import { WorkspaceProvider } from "@/lib/workspace-context";

// Eager imports (lightweight / entry pages)
import Dashboard          from "@/pages/dashboard";
import ExecutiveBrief     from "@/pages/executive-brief";
import AuthPage           from "@/pages/auth";

// Lazy imports (heavier pages)
const ResearchCommandCenter = lazy(() => import("@/pages/research-command-center"));
const Niche              = lazy(() => import("@/pages/niche"));
const Hooks              = lazy(() => import("@/pages/hooks"));
const Prompts            = lazy(() => import("@/pages/prompts"));
const Competitors        = lazy(() => import("@/pages/competitors"));
const Automation         = lazy(() => import("@/pages/automation"));
const Generator          = lazy(() => import("@/pages/generator"));
const UsagePage          = lazy(() => import("@/pages/usage"));
const CalendarPage       = lazy(() => import("@/pages/calendar"));
const AnalyticsPage      = lazy(() => import("@/pages/analytics"));
const VaultPage          = lazy(() => import("@/pages/vault"));
const ContentPackPage    = lazy(() => import("@/pages/content-pack"));
const ProfilePage        = lazy(() => import("@/pages/profile"));
const WorkspacePage      = lazy(() => import("@/pages/workspace"));
const TikTokAccountsPage = lazy(() => import("@/pages/tiktok-accounts"));
const SettingsPage       = lazy(() => import("@/pages/settings"));

// Thin loading fallback — preserves layout, shows a subtle shimmer
function PageLoader() {
  return (
    <div className="animate-pulse space-y-4 p-2">
      <div className="h-8 w-48 bg-primary/10 rounded" />
      <div className="h-4 w-64 bg-muted/20 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-muted/10 rounded-lg border border-border" />
        ))}
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000 },
  },
});

function AppRoutes() {
  return (
    <Switch>
      {/* Auth page — no Layout */}
      <Route path="/login" component={AuthPage} />

      {/* All other routes — inside Layout */}
      <Route>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Switch>
              <Route path="/brief"         component={ExecutiveBrief}        />
              <Route path="/research"      component={ResearchCommandCenter} />
              <Route path="/"             component={Dashboard}             />
              <Route path="/niche"        component={Niche}              />
              <Route path="/hooks"        component={Hooks}              />
              <Route path="/prompts"      component={Prompts}            />
              <Route path="/competitors"  component={Competitors}        />
              <Route path="/automation"   component={Automation}         />
              <Route path="/generator"    component={Generator}          />
              <Route path="/vault"        component={VaultPage}          />
              <Route path="/calendar"     component={CalendarPage}       />
              <Route path="/analytics"    component={AnalyticsPage}      />
              <Route path="/usage"        component={UsagePage}          />
              <Route path="/content-pack" component={ContentPackPage}    />
              <Route path="/workspace"    component={WorkspacePage}      />
              <Route path="/accounts"     component={TikTokAccountsPage} />
              <Route path="/profile"      component={ProfilePage}        />
              <Route path="/settings"     component={SettingsPage}       />
              <Route                      component={NotFound}           />
            </Switch>
          </Suspense>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <WorkspaceProvider>
              <AppRoutes />
            </WorkspaceProvider>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
