// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig(({ mode }) => {
  // Local Node dev server can read server-only values from .env at runtime.
  // Never define these into the production bundle; Cloudflare supplies secrets
  // through Worker bindings at request time.
  if (mode === "development" && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const localEnv = loadEnv(mode, process.cwd(), "");
    if (localEnv.SUPABASE_SERVICE_ROLE_KEY) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
    }
  }

  return {
    tanstackStart: {
      server: { entry: "server" },
    },
    vite: {
      resolve: {
        dedupe: ["react", "react-dom"],
      },
    },
  };
});
