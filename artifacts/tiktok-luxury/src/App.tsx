import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Niche from "@/pages/niche";
import Hooks from "@/pages/hooks";
import Prompts from "@/pages/prompts";
import Competitors from "@/pages/competitors";
import Automation from "@/pages/automation";
import Generator from "@/pages/generator";
import UsagePage from "@/pages/usage";
import CalendarPage from "@/pages/calendar";
import AnalyticsPage from "@/pages/analytics";
import VaultPage from "@/pages/vault";
import ContentPackPage from "@/pages/content-pack";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/niche" component={Niche} />
        <Route path="/hooks" component={Hooks} />
        <Route path="/prompts" component={Prompts} />
        <Route path="/competitors" component={Competitors} />
        <Route path="/automation" component={Automation} />
        <Route path="/generator" component={Generator} />
        <Route path="/vault" component={VaultPage} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/usage" component={UsagePage} />
        <Route path="/content-pack" component={ContentPackPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
