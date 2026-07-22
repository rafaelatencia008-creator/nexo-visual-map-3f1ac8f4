/**
 * AJUSTE VISUAL DE MARCA — presença discreta do Nexo Pericial 360
 * no shell interno (AppTopbar, AppSidebar, BottomNav).
 *
 * Testes de auditoria estática — inspecionam o texto-fonte
 * removendo comentários antes de aplicar as buscas.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

/** Remove comentários /* ... *\/ e // ... para evitar falsos positivos. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const TOPBAR = stripComments(read("src/components/app/AppTopbar.tsx"));
const SIDEBAR = stripComments(read("src/components/app/AppSidebar.tsx"));
const BOTTOM = stripComments(read("src/components/app/BottomNav.tsx"));

describe("AppTopbar — marca no cabeçalho mobile", () => {
  test("01. importa o Logo oficial de @/components/brand/Logo", () => {
    expect(TOPBAR).toMatch(
      /import\s*\{\s*Logo\s*\}\s*from\s*["']@\/components\/brand\/Logo["']/,
    );
  });

  test("02. usa Logo variant=\"mark\" no cabeçalho", () => {
    expect(TOPBAR).toMatch(/<Logo[^>]*variant=["']mark["']/);
  });

  test("03. botão mobile tem nome acessível contendo 'Nexo Pericial 360'", () => {
    expect(TOPBAR).toMatch(
      /aria-label=["']Abrir navegação do Nexo Pericial 360["']/,
    );
  });

  test("04. botão mobile chama toggleSidebar()", () => {
    expect(TOPBAR).toMatch(/useSidebar\s*\(\s*\)/);
    expect(TOPBAR).toMatch(/toggleSidebar/);
    expect(TOPBAR).toMatch(/onClick=\{toggleSidebar\}/);
  });

  test("05. botão com marca fica restrito ao mobile (sm:hidden)", () => {
    const match = TOPBAR.match(/<Button[\s\S]*?<Logo[\s\S]*?<\/Button>/);
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/sm:hidden/);
  });

  test("06. SidebarTrigger permanece disponível a partir de sm (hidden sm:inline-flex)", () => {
    expect(TOPBAR).toMatch(
      /<SidebarTrigger[^>]*className=["'][^"']*hidden\s+sm:inline-flex/,
    );
  });

  test("07. busca global (GlobalSearch) continua montada", () => {
    expect(TOPBAR).toMatch(/<GlobalSearch\b/);
  });

  test("08. alternância de tema continua montada", () => {
    expect(TOPBAR).toMatch(/aria-label=\{theme === ["']dark["']/);
  });

  test("09. NotificationsPopover continua montado", () => {
    expect(TOPBAR).toMatch(/<NotificationsPopover\b/);
  });

  test("10. UserMenu continua montado", () => {
    expect(TOPBAR).toMatch(/<UserMenu\b/);
  });

  test("10b. símbolo dentro do botão é decorativo (aria-hidden)", () => {
    const match = TOPBAR.match(/<Button[\s\S]*?<Logo[\s\S]*?<\/Button>/);
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/aria-hidden/);
  });
});

describe("AppSidebar — marca na barra lateral desktop", () => {
  test("11. usa Logo variant=\"full\" quando expandido", () => {
    expect(SIDEBAR).toMatch(/<Logo[^>]*variant=["']full["']/);
  });

  test("12. usa Logo variant=\"mark\" quando recolhido", () => {
    expect(SIDEBAR).toMatch(/<Logo[^>]*variant=["']mark["']/);
    expect(SIDEBAR).toMatch(/collapsed\s*\?/);
  });

  test("13. não reconstrói manualmente o texto 'Nexo 360' em <span>", () => {
    expect(SIDEBAR).not.toMatch(/<span[^>]*>\s*Nexo\s*360\s*<\/span>/);
  });

  test("13b. link do cabeçalho da sidebar tem aria-label do Nexo Pericial 360", () => {
    expect(SIDEBAR).toMatch(/aria-label=["']Nexo Pericial 360[^"']*["']/);
  });
});

describe("BottomNav — marca no menu 'Todos os módulos'", () => {
  test("14. menu 'Todos os módulos' usa o Logo oficial", () => {
    expect(BOTTOM).toMatch(
      /import\s*\{\s*Logo\s*\}\s*from\s*["']@\/components\/brand\/Logo["']/,
    );
    expect(BOTTOM).toMatch(/<Logo[^>]*variant=["']full["']/);
  });

  test("15. logo aparece antes de <SheetTitle>Todos os módulos", () => {
    const idxLogo = BOTTOM.search(/<Logo[^>]*variant=["']full["']/);
    const idxTitle = BOTTOM.search(/<SheetTitle>\s*Todos os módulos/);
    expect(idxLogo).toBeGreaterThan(-1);
    expect(idxTitle).toBeGreaterThan(-1);
    expect(idxLogo).toBeLessThan(idxTitle);
  });

  test("16. título 'Todos os módulos' permanece", () => {
    expect(BOTTOM).toMatch(/<SheetTitle>\s*Todos os módulos\s*<\/SheetTitle>/);
  });

  test("17. descrição 'Navegue por todas as áreas do sistema.' permanece", () => {
    expect(BOTTOM).toMatch(/Navegue por todas as áreas do sistema\./);
  });

  test("18. Sheet 'Ações rápidas' permanece sem alteração funcional", () => {
    expect(BOTTOM).toMatch(/<SheetTitle>\s*Ações rápidas\s*<\/SheetTitle>/);
    expect(BOTTOM).toMatch(/QUICK_ACTIONS\.map/);
  });

  test("19. BottomNav continua com cinco itens no ITEMS", () => {
    const match = BOTTOM.match(/const ITEMS:\s*Item\[\]\s*=\s*\[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    const commas = (match![1].match(/kind:/g) ?? []).length;
    expect(commas).toBe(5);
  });
});

describe("Higiene — nenhum arquivo importa favicon ou raster", () => {
  const forbidden = /(favicon|\.png|\.jpe?g|\.webp|\.gif)["']/i;

  test("20a. AppTopbar não importa favicon/raster", () => {
    expect(forbidden.test(TOPBAR)).toBe(false);
  });

  test("20b. AppSidebar não importa favicon/raster", () => {
    expect(forbidden.test(SIDEBAR)).toBe(false);
  });

  test("20c. BottomNav não importa favicon/raster", () => {
    expect(forbidden.test(BOTTOM)).toBe(false);
  });
});
