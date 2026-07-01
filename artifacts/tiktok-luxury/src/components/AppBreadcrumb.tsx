import { useLocation, Link } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ROUTE_LABELS: Record<string, string> = {
  "/niche":        "Niche Intelligence",
  "/hooks":        "Viral Hooks",
  "/prompts":      "Prompt Vault",
  "/competitors":  "Competitors",
  "/automation":   "AI Automation",
  "/generator":    "AI Content Generator",
  "/vault":        "Intelligence Vault",
  "/calendar":     "Content Calendar",
  "/analytics":    "Analytics Intelligence",
  "/usage":        "Usage Tracker",
  "/content-pack": "Content Pack Generator",
  "/workspace":    "TikTok Workspace",
  "/accounts":     "TikTok Accounts",
  "/profile":      "User Profile",
  "/settings":     "Settings",
};

export function AppBreadcrumb() {
  const [location] = useLocation();

  if (location === "/" || location === "/login") return null;

  const label = ROUTE_LABELS[location] ?? "Page";

  return (
    <Breadcrumb className="mb-5">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
