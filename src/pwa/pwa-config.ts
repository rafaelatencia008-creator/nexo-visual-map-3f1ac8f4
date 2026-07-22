/**
 * PWA-01 — configuração central do Nexo Pericial 360.
 *
 * Centraliza manifesto, catálogo de ícones, cores e a configuração segura
 * do Workbox. Sem side effects; importado por `vite.config.ts` e pelos
 * testes de contrato em `tests/pwa-setup.test.ts`.
 */

import type { ManifestOptions } from "vite-plugin-pwa";
import type { GenerateSWOptions } from "workbox-build";

/** Cor principal — azul-marinho institucional do Nexo Pericial 360. */
export const NEXO_THEME_COLOR = "#1E3A5F" as const;
/** Fundo claro institucional — branco quente. */
export const NEXO_BACKGROUND_COLOR = "#FAFAF7" as const;
/** Detalhe dourado da marca (referência estática, não usado em CSS). */
export const NEXO_BRAND_ACCENT = "#B8935A" as const;

/**
 * Manifesto oficial. Preserva `standalone` como modo principal e
 * `["fullscreen", "standalone"]` em `display_override` — a preferência é
 * fullscreen, com fallback seguro para janela standalone.
 */
export const NEXO_PWA_MANIFEST = {
  id: "/",
  name: "Nexo Pericial 360",
  short_name: "Nexo 360",
  description:
    "Plataforma de apoio à organização e condução do trabalho pericial.",
  lang: "pt-BR",
  dir: "ltr",
  start_url: "/",
  scope: "/",
  display: "standalone",
  display_override: ["fullscreen", "standalone"],
  orientation: "any",
  theme_color: NEXO_THEME_COLOR,
  background_color: NEXO_BACKGROUND_COLOR,
  categories: ["business", "productivity"],
  icons: [
    {
      src: "/pwa-64x64.png",
      sizes: "64x64",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/pwa-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/pwa-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/maskable-icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
} as const satisfies Partial<ManifestOptions>;

/**
 * Configuração do Workbox — precache somente arquivos estáticos gerados
 * pelo build. `navigateFallback: null` (não usar SPA fallback num app SSR).
 * Sem `runtimeCaching` para dados funcionais.
 */
export const NEXO_PWA_WORKBOX = {
  cleanupOutdatedCaches: true,
  navigateFallback: null,
  globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
  // Nunca cachear payloads dinâmicos — nem via runtime, nem via injeção.
  runtimeCaching: [],
} as const satisfies Partial<GenerateSWOptions>;

/** Ativos estáticos referenciados diretamente no `<head>`. */
export const NEXO_PWA_INCLUDE_ASSETS = [
  "favicon.ico",
  "favicon.svg",
  "apple-touch-icon-180x180.png",
] as const;

/** Tipo público conveniente para testes e módulos externos. */
export type NexoPwaManifest = typeof NEXO_PWA_MANIFEST;
export type NexoPwaWorkbox = typeof NEXO_PWA_WORKBOX;
