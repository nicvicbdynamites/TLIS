import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const appDir = path.resolve(import.meta.dirname);
const repoRoot = path.resolve(appDir, "..", "..");

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const rawPort = env.PORT ?? process.env.PORT ?? "21837";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = env.BASE_PATH ?? process.env.BASE_PATH ?? "/";
  const plugins = [react(), tailwindcss(), runtimeErrorOverlay()];

  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    const [cartographer, devBanner] = await Promise.all([
      import("@replit/vite-plugin-cartographer"),
      import("@replit/vite-plugin-dev-banner"),
    ]);

    plugins.push(
      cartographer.cartographer({
        root: path.resolve(appDir, ".."),
      }),
      devBanner.devBanner(),
    );
  }

  return {
    base: basePath,
    envDir: repoRoot,
    envPrefix: ["VITE_", "SUPABASE_"],
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(appDir, "src"),
        "@assets": path.resolve(appDir, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: appDir,
    build: {
      outDir: path.resolve(appDir, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/api": {
          target: process.env.API_TARGET || "http://localhost:5000",
          changeOrigin: true,
        },
      },
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
