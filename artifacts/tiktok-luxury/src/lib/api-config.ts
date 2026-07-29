/**
 * API Configuration and URL builder for TLIS frontend.
 * Enables seamless routing across local development (Vite proxy)
 * and Cloud Run / production deployments.
 */

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // 1. Check window override if injected by environment
    const win = window as unknown as { __TLIS_API_URL__?: string };
    if (win.__TLIS_API_URL__ && typeof win.__TLIS_API_URL__ === "string") {
      return win.__TLIS_API_URL__.replace(/\/+$/, "");
    }

    // 2. Check import.meta.env VITE_API_URL
    const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
    if (envUrl) {
      return envUrl.replace(/\/+$/, "");
    }
  }
  return "";
}

export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${cleanPath}` : cleanPath;
}
