import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

// ── ADDITIVE static / SPA build for GitHub Pages ─────────────────────────────
// This config is used ONLY for the public static demo at
// https://zonic-jpg.github.io/myafriart/ . It does NOT touch the SSR/Supabase
// production path (vite.config.ts + server.mjs), which is built with the normal
// `npm run build`. Here we turn on TanStack Start SPA mode (prerender an app
// shell that hydrates + client-routes) and serve everything under the /myafriart/
// subpath. Backend/server-fn calls degrade to the app's built-in local mock data.
const BASE = "/myafriart/";

export default defineConfig({
  base: BASE,
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
      router: { basepath: BASE },
      spa: { enabled: true },
      // In this build environment os.cpus() can report 0 cores, which makes the
      // SPA shell prerender queue default to concurrency 0 and hang forever.
      // Pin an explicit concurrency so the shell always renders.
      prerender: { concurrency: 4 },
    }),
    viteReact(),
  ],
});
