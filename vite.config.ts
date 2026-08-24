import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

// De-Cloudflared config. The @cloudflare/vite-plugin (which forced a Workers
// build target) has been removed. The app is unchanged — same TanStack Start
// SSR, same src/server.ts entry — but it now builds a Node server so it can be
// hosted on AWS (App Runner / ECS / Elastic Beanstalk / EC2).
//
// Build a Node server with:  NITRO_PRESET=node-server vite build
// (the "build" script sets this for you).
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({ server: { entry: "server" } }),
    viteReact(),
  ],
});
