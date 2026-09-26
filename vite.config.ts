// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      // Server-only Supabase service-role key, baked at build time from .env.
      // Never prefixed with VITE_ so it is NOT exposed to the browser bundle
      // as import.meta.env — only bundled into the server output. The Worker
      // still cannot reach localhost Postgres, so the server functions fall
      // back to Supabase REST with this key.
      "process.env.SUPABASE_SERVICE_ROLE_KEY": JSON.stringify(
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      ),
    },
  },
});
