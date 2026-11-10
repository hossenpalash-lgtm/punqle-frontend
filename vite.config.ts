import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// The nitro plugin compiles the server bundle for the actual deploy
// target — without it, Vercel has nothing to turn into a Vercel
// Function and the deploy silently produces a static-only build.
export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart(),
    nitro({
      // Pictures and clips shipped in /public used to be served with "max-age=0, must-revalidate", so a
      // returning visitor's browser asked the server about every one of them again (~30 round trips on the
      // landing page). One day fresh, then a week of "show it while checking" (2026-11-10). If a file in
      // these folders is ever replaced, give it a NEW name — browsers may keep the old one up to a day.
      routeRules: Object.fromEntries(
        ["actors", "thumbs", "showcase-ads", "demo", "home", "hero-cards", "scene-previews", "video-style-previews", "style-previews", "examples"].map((dir) => [
          `/${dir}/**`,
          { headers: { "cache-control": "public, max-age=86400, stale-while-revalidate=604800" } },
        ]),
      ),
    }),
    viteReact(),
  ],
});
