import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import {
  NEXO_PWA_INCLUDE_ASSETS,
  NEXO_PWA_MANIFEST,
  NEXO_PWA_WORKBOX,
} from "./src/pwa/pwa-config";

// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "prompt",
        injectRegister: false,
        includeAssets: [...NEXO_PWA_INCLUDE_ASSETS],
        manifest: { ...NEXO_PWA_MANIFEST },
        workbox: { ...NEXO_PWA_WORKBOX },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  },
});
