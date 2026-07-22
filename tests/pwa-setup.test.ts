/**
 * PWA-01 — testes de contrato do setup de PWA do Nexo Pericial 360.
 *
 * Somente leitura de manifesto, arquivos gerados e configuração estática.
 * Nenhum navegador automatizado, nenhuma renderização React.
 */

import { describe, it, expect } from "bun:test";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  NEXO_BACKGROUND_COLOR,
  NEXO_PWA_INCLUDE_ASSETS,
  NEXO_PWA_MANIFEST,
  NEXO_PWA_WORKBOX,
  NEXO_THEME_COLOR,
} from "../src/pwa/pwa-config";

const root = resolve(__dirname, "..");
const readText = (rel: string) => readFileSync(resolve(root, rel), "utf-8");
const readBytes = (rel: string) => readFileSync(resolve(root, rel));

/** Lê largura e altura de um IHDR de PNG. Retorna [w, h] ou lança. */
function readPngSize(buf: Buffer): [number, number] {
  // PNG signature (8 bytes) + IHDR length (4) + "IHDR" (4) + width (4) + height (4)
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(sig)) throw new Error("assinatura PNG inválida");
  if (buf.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("IHDR ausente");
  }
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return [w, h];
}

describe("PWA-01 · manifesto", () => {
  it("(1) nome completo", () => {
    expect(NEXO_PWA_MANIFEST.name).toBe("Nexo Pericial 360");
  });
  it("(2) nome curto", () => {
    expect(NEXO_PWA_MANIFEST.short_name).toBe("Nexo 360");
  });
  it("(3) idioma pt-BR", () => {
    expect(NEXO_PWA_MANIFEST.lang).toBe("pt-BR");
  });
  it("(4) id = /", () => {
    expect(NEXO_PWA_MANIFEST.id).toBe("/");
  });
  it("(5) start_url = /", () => {
    expect(NEXO_PWA_MANIFEST.start_url).toBe("/");
  });
  it("(6) scope = /", () => {
    expect(NEXO_PWA_MANIFEST.scope).toBe("/");
  });
  it("(7) display = standalone", () => {
    expect(NEXO_PWA_MANIFEST.display).toBe("standalone");
  });
  it("(8) display_override prioriza fullscreen com fallback standalone", () => {
    expect(Array.from(NEXO_PWA_MANIFEST.display_override)).toEqual([
      "fullscreen",
      "standalone",
    ]);
    expect(NEXO_PWA_MANIFEST.display_override[0]).toBe("fullscreen");
  });
  it("(9) theme_color = #1E3A5F", () => {
    expect(NEXO_PWA_MANIFEST.theme_color).toBe(NEXO_THEME_COLOR);
    expect(NEXO_THEME_COLOR).toBe("#1E3A5F");
  });
  it("(10) background_color = #FAFAF7", () => {
    expect(NEXO_PWA_MANIFEST.background_color).toBe(NEXO_BACKGROUND_COLOR);
    expect(NEXO_BACKGROUND_COLOR).toBe("#FAFAF7");
  });
});

describe("PWA-01 · catálogo de ícones", () => {
  const icons = NEXO_PWA_MANIFEST.icons;
  it("(11) inclui 192x192 com purpose any", () => {
    const i = icons.find((i) => i.sizes === "192x192");
    expect(i).toBeDefined();
    expect(i!.purpose).toBe("any");
    expect(i!.type).toBe("image/png");
  });
  it("(12) inclui 512x512 com purpose any", () => {
    const i = icons.find((i) => i.sizes === "512x512" && i.purpose === "any");
    expect(i).toBeDefined();
    expect(i!.src).toBe("/pwa-512x512.png");
  });
  it("(13) inclui arquivo separado 512x512 com purpose maskable", () => {
    const any512 = icons.find(
      (i) => i.sizes === "512x512" && i.purpose === "any",
    )!;
    const mask = icons.find(
      (i) => i.sizes === "512x512" && i.purpose === "maskable",
    );
    expect(mask).toBeDefined();
    expect(mask!.src).toBe("/maskable-icon-512x512.png");
    // arquivo separado, não reutilização
    expect(mask!.src).not.toBe(any512.src);
    // não usar "any maskable" combinado
    for (const i of icons) {
      expect(i.purpose).not.toBe("any maskable");
    }
  });
});

describe("PWA-01 · arquivos gerados", () => {
  const files = [
    "public/favicon.ico",
    "public/favicon.svg",
    "public/pwa-64x64.png",
    "public/pwa-192x192.png",
    "public/pwa-512x512.png",
    "public/maskable-icon-512x512.png",
    "public/apple-touch-icon-180x180.png",
  ] as const;

  it("(14) todos os arquivos existem e não estão vazios", () => {
    for (const rel of files) {
      const s = statSync(resolve(root, rel));
      expect(s.size).toBeGreaterThan(100);
    }
  });

  it("(15) PNGs têm assinatura PNG válida", () => {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    for (const rel of files) {
      if (!rel.endsWith(".png")) continue;
      const buf = readBytes(rel);
      expect(buf.subarray(0, 8).equals(sig)).toBe(true);
    }
  });

  it("(16) dimensões dos PNGs correspondem aos nomes", () => {
    const cases: ReadonlyArray<[string, number, number]> = [
      ["public/pwa-64x64.png", 64, 64],
      ["public/pwa-192x192.png", 192, 192],
      ["public/pwa-512x512.png", 512, 512],
      ["public/maskable-icon-512x512.png", 512, 512],
      ["public/apple-touch-icon-180x180.png", 180, 180],
    ];
    for (const [rel, w, h] of cases) {
      const [rw, rh] = readPngSize(readBytes(rel));
      expect(rw).toBe(w);
      expect(rh).toBe(h);
    }
  });

  it("(17) apple touch icon existe com 180x180", () => {
    const [w, h] = readPngSize(readBytes("public/apple-touch-icon-180x180.png"));
    expect(w).toBe(180);
    expect(h).toBe(180);
  });
});

describe("PWA-01 · __root.tsx", () => {
  const src = readText("src/routes/__root.tsx");

  it("(18) viewport contém viewport-fit=cover", () => {
    expect(src).toContain("viewport-fit=cover");
  });
  it("(19) contém somente um link de manifesto", () => {
    const matches = src.match(/rel:\s*"manifest"/g) ?? [];
    expect(matches.length).toBe(1);
    expect(src).toContain("/manifest.webmanifest");
  });
  it("(20) contém metadados Apple e Android", () => {
    expect(src).toContain("apple-mobile-web-app-capable");
    expect(src).toContain("apple-mobile-web-app-status-bar-style");
    expect(src).toContain("apple-mobile-web-app-title");
    expect(src).toContain("mobile-web-app-capable");
    expect(src).toContain("application-name");
    expect(src).toContain("theme-color");
    expect(src).toContain('href: "/apple-touch-icon-180x180.png"');
    expect(src).toContain('href: "/favicon.svg"');
    expect(src).toContain('href: "/favicon.ico"');
  });
  it("(20b) referência ao favicon.ico não é duplicada", () => {
    const iconLinks = src.match(/rel:\s*"icon"/g) ?? [];
    // favicon.ico + favicon.svg (rel="icon") = exatamente 2
    expect(iconLinks.length).toBe(2);
  });
});

describe("PWA-01 · vite.config.ts", () => {
  const src = readText("vite.config.ts");
  it("(21) usa VitePWA", () => {
    expect(src).toContain('from "vite-plugin-pwa"');
    expect(src).toContain("VitePWA(");
  });
  it("(22) preserva @lovable.dev/vite-tanstack-config", () => {
    expect(src).toContain('from "@lovable.dev/vite-tanstack-config"');
    expect(src).not.toContain('from "vite"');
  });
  it("(23) não duplica plugins centrais fornecidos pelo Lovable", () => {
    for (const forbidden of [
      "tanstackStart(",
      "viteReact(",
      "@vitejs/plugin-react",
      "@tailwindcss/vite",
      "vite-tsconfig-paths",
      "TanStackRouterVite",
    ]) {
      expect(src).not.toContain(forbidden);
    }
  });
  it("(24) estratégia é generateSW", () => {
    expect(NEXO_PWA_WORKBOX).toBeDefined();
    // strategies definido na chamada VitePWA:
    expect(src).toContain('strategies: "generateSW"');
  });
  it("(25) service worker desativado em dev", () => {
    expect(src).toContain("devOptions");
    // devOptions.enabled: false (aceita espaços/quebras)
    expect(/devOptions:\s*{[\s\S]*?enabled:\s*false/.test(src)).toBe(true);
  });
});

describe("PWA-01 · Workbox seguro", () => {
  it("(26) navigateFallback está desativado", () => {
    expect(NEXO_PWA_WORKBOX.navigateFallback).toBeNull();
  });
  it("(27) não há runtimeCaching de API ou dados funcionais", () => {
    expect(Array.isArray(NEXO_PWA_WORKBOX.runtimeCaching)).toBe(true);
    expect(NEXO_PWA_WORKBOX.runtimeCaching.length).toBe(0);
  });
  it("(27b) cleanupOutdatedCaches ligado e globPatterns só cobrem estáticos", () => {
    expect(NEXO_PWA_WORKBOX.cleanupOutdatedCaches).toBe(true);
    for (const pattern of NEXO_PWA_WORKBOX.globPatterns) {
      expect(pattern).not.toMatch(/json|api|processos|pessoas|graphql/i);
    }
  });
  it("(27c) includeAssets referencia somente ícones estáticos", () => {
    expect(Array.from(NEXO_PWA_INCLUDE_ASSETS)).toEqual([
      "favicon.ico",
      "favicon.svg",
      "apple-touch-icon-180x180.png",
    ]);
  });
});

describe("PWA-01 · PwaUpdatePrompt", () => {
  const src = readText("src/components/pwa/PwaUpdatePrompt.tsx");

  it("(28) usa virtual:pwa-register/react", () => {
    expect(src).toContain('from "virtual:pwa-register/react"');
    expect(src).toContain("useRegisterSW");
  });
  it("(29) não usa reload automático direto", () => {
    expect(src).not.toContain("window.location.reload");
    expect(src).not.toContain("location.reload");
    expect(src).not.toMatch(/setTimeout\s*\(/);
    expect(src).not.toMatch(/setInterval\s*\(/);
  });
  it("(29b) montado uma única vez em __root.tsx", () => {
    const root = readText("src/routes/__root.tsx");
    const occ = root.match(/<PwaUpdatePrompt\s*\/>/g) ?? [];
    expect(occ.length).toBe(1);
    expect(root).toContain(
      'from "@/components/pwa/PwaUpdatePrompt"',
    );
  });
});

describe("PWA-01 · áreas seguras", () => {
  it("(30) BottomNav continua respeitando safe-area-inset-bottom", () => {
    const src = readText("src/components/app/BottomNav.tsx");
    expect(src).toContain("pb-[env(safe-area-inset-bottom)]");
  });
  it("(30b) styles.css define variáveis --safe-area-*", () => {
    const css = readText("src/styles.css");
    expect(css).toContain("--safe-area-top: env(safe-area-inset-top");
    expect(css).toContain("--safe-area-bottom: env(safe-area-inset-bottom");
    expect(css).toContain("100dvh");
  });
  it("(30c) AppTopbar aplica safe-area-inset-top", () => {
    const src = readText("src/components/app/AppTopbar.tsx");
    expect(src).toContain("pt-[env(safe-area-inset-top)]");
  });
});

// ------------------------------------------------------------------
// PWA-01.1 — precache seguro (sem HTML)
// ------------------------------------------------------------------

/** Extrai o conjunto de extensões declaradas em padrões `**\/*.{a,b,c}`. */
function extractGlobExtensions(patterns: readonly string[]): Set<string> {
  const exts = new Set<string>();
  for (const raw of patterns) {
    const pattern = raw.toLowerCase();
    const braceMatch = pattern.match(/\{([^}]+)\}/);
    if (braceMatch) {
      for (const ext of braceMatch[1].split(",")) {
        exts.add(ext.trim());
      }
      continue;
    }
    const tail = pattern.match(/\.([a-z0-9]+)$/);
    if (tail) exts.add(tail[1]);
  }
  return exts;
}

describe("PWA-01.1 · precache sem HTML", () => {
  const patterns = NEXO_PWA_WORKBOX.globPatterns as readonly string[];
  const extensions = extractGlobExtensions(patterns);

  it("(31) nenhum padrão de precache contém a extensão html", () => {
    for (const pattern of patterns) {
      expect(pattern.toLowerCase()).not.toMatch(/\bhtml\b/);
    }
    expect(extensions.has("html")).toBe(false);
  });

  it("(32) nenhum padrão de precache contém a extensão htm", () => {
    for (const pattern of patterns) {
      expect(pattern.toLowerCase()).not.toMatch(/\bhtm\b/);
    }
    expect(extensions.has("htm")).toBe(false);
  });

  it("(33) catálogo permitido é exatamente {js,css,svg,png,ico,woff,woff2}", () => {
    const allowed = new Set(["js", "css", "svg", "png", "ico", "woff", "woff2"]);
    expect(extensions.size).toBe(allowed.size);
    for (const ext of allowed) {
      expect(extensions.has(ext)).toBe(true);
    }
    for (const ext of extensions) {
      expect(allowed.has(ext)).toBe(true);
    }
  });

  it("(34) padrões não incluem documentos, dados ou artefatos dinâmicos", () => {
    const forbidden = [
      "html",
      "htm",
      "json",
      "xml",
      "txt",
      "pdf",
      "doc",
      "docx",
      "map",
      "webmanifest",
      "wasm",
    ];
    for (const ext of forbidden) {
      expect(extensions.has(ext)).toBe(false);
    }
  });

  it("(35) estratégia SSR-segura preservada (fallback nulo, sem runtime cache)", () => {
    expect(NEXO_PWA_WORKBOX.navigateFallback).toBeNull();
    expect(NEXO_PWA_WORKBOX.runtimeCaching.length).toBe(0);
    expect(NEXO_PWA_WORKBOX.cleanupOutdatedCaches).toBe(true);
  });

  it("(36) fonte de pwa-config.ts não reintroduz HTML por caminhos alternativos", () => {
    const raw = readText("src/pwa/pwa-config.ts");
    // Remove comentários de bloco e de linha antes da auditoria.
    const stripped = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(stripped).not.toMatch(/\.html\b/);
    expect(stripped).not.toContain("index.html");
    expect(stripped).not.toMatch(/navigateFallback\s*:\s*["']\/["']/);
    expect(stripped).not.toMatch(/navigateFallback\s*:\s*["']\/index\.html["']/);
  });
});
