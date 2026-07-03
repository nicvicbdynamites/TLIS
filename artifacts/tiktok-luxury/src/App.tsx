import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { lazy, Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { AuthProvider, useAuth } from "@/lib/auth";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Eager imports (lightweight / entry pages)
import Dashboard          from "@/pages/dashboard";
import ExecutiveBrief     from "@/pages/executive-brief";
import AuthPage           from "@/pages/auth";

// Lazy imports (heavier pages)
const ExecutiveCommandCenter = lazy(() => import("@/pages/executive-command-center"));
const ResearchCommandCenter  = lazy(() => import("@/pages/research-command-center"));
const IntelligencePipeline   = lazy(() => import("@/pages/intelligence-pipeline"));
const AIIntelligenceEngine   = lazy(() => import("@/pages/ai-intelligence-engine"));
const IntegrationHub         = lazy(() => import("@/pages/integration-hub"));
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
const AuditLogPage       = lazy(() => import("@/pages/audit"));
const PlatformHealthPage = lazy(() => import("@/pages/platform-health"));

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

// Module 11 — centralized auth gate for all Layout routes. Never redirects
// while the Supabase session is still hydrating (avoids a login-page flash
// for already-authenticated users on refresh/deep-link).
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Redirect to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Switch>
      {/* Auth pages — no Layout. All render AuthPage; the path only picks
          which tab starts active (see initialTabFromPath in pages/auth.tsx).
          /login remains the canonical route used for Supabase email
          redirects (signup confirmation + password recovery links). */}
      <Route path="/login"                  component={AuthPage} />
      <Route path="/auth/login"             component={AuthPage} />
      <Route path="/auth/register"          component={AuthPage} />
      <Route path="/auth/forgot-password"   component={AuthPage} />
      <Route path="/auth/reset-password"    component={AuthPage} />

      {/* All other routes — inside Layout */}
      <Route>
        <Layout>
          <RequireAuth>
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/command"       component={ExecutiveCommandCenter} />
                <Route path="/brief"         component={ExecutiveBrief}        />
                <Route path="/research"      component={ResearchCommandCenter}  />
                <Route path="/pipeline"     component={IntelligencePipeline}   />
                <Route path="/ai-engine"    component={AIIntelligenceEngine}   />
                <Route path="/integrations" component={IntegrationHub}         />
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
                <Route path="/audit-log"    component={AuditLogPage}       />
                <Route path="/platform-health" component={PlatformHealthPage} />
                <Route                      component={NotFound}           />
              </Switch>
            </Suspense>
          </RequireAuth>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
