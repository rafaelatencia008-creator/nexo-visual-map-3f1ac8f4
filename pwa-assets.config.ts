import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

/**
 * PWA-01 — geração dos ícones estáticos do Nexo Pericial 360.
 *
 * Fonte oficial: `public/favicon.svg`, reprodução fiel da geometria do
 * componente `BrandMark` em `src/components/brand/Logo.tsx`.
 *
 * Cores fixas (não dependem de tokens CSS, pois ícones são estáticos):
 *   Azul-marinho institucional  #1E3A5F
 *   Dourado discreto            #B8935A
 *   Fundo claro (maskable/apple) #FAFAF7
 */
const preset = minimal2023Preset;

// Reforça o fundo claro do maskable e do apple touch icon com a cor da marca,
// mantendo a área segura interna de 30% do preset.
preset.maskable.resizeOptions = {
  ...(preset.maskable.resizeOptions ?? {}),
  background: "#FAFAF7",
};
preset.apple.resizeOptions = {
  ...(preset.apple.resizeOptions ?? {}),
  background: "#FAFAF7",
};

export default defineConfig({
  preset,
  images: ["public/favicon.svg"],
});
