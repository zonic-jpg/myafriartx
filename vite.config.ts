import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import netlify from "@netlify/vite-plugin-tanstack-start";

// Production build for Netlify.
//
// ArtStage is a TanStack Start SSR app: every `createServerFn` (stageRoom,
// adminGetAll, the auth middleware) only exists if a server runs. Publishing the
// client bundle as a static site left those endpoints unroutable, which is why
// staging never rendered against the backdrop. The official Netlify adapter
// below emits a serverless function from the same `src/server.ts` entry, so the
// server functions execute on Netlify with no container host.
//
// Do NOT swap this for vite.config.static.ts — that config is the GitHub Pages
// demo and drops the server entirely.
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({ server: { entry: "server" } }),
    viteReact(),
    netlify(),
  ],
});
