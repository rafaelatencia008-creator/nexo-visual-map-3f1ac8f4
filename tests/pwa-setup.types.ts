/**
 * PWA-01 — provas de tipo estáticas do setup de PWA.
 *
 * Se algum contrato do vite-plugin-pwa mudar, o typecheck falha.
 */

import type { ManifestOptions, VitePWAOptions } from "vite-plugin-pwa";
import type { GenerateSWOptions } from "workbox-build";
import {
  NEXO_PWA_MANIFEST,
  NEXO_PWA_WORKBOX,
  type NexoPwaManifest,
  type NexoPwaWorkbox,
} from "../src/pwa/pwa-config";

// O manifesto real é compatível com o tipo do plugin.
const _manifestOk: Partial<ManifestOptions> = { ...NEXO_PWA_MANIFEST };
void _manifestOk;

// A configuração do Workbox é tipada e compatível com generateSW.
const _workboxOk: Partial<GenerateSWOptions> = { ...NEXO_PWA_WORKBOX };
void _workboxOk;

// Ambos são aceitos pelas opções principais do plugin.
const _pluginOk: Partial<VitePWAOptions> = {
  strategies: "generateSW",
  registerType: "prompt",
  injectRegister: false,
  manifest: { ...NEXO_PWA_MANIFEST },
  workbox: { ...NEXO_PWA_WORKBOX },
  devOptions: { enabled: false },
};
void _pluginOk;

// display válido é aceito.
const _displayOk: ManifestOptions["display"] = NEXO_PWA_MANIFEST.display;
void _displayOk;

// @ts-expect-error — valor de display inventado deve ser recusado.
const _displayBad: ManifestOptions["display"] = "app-window";
void _displayBad;

// display_override não aceita valores inventados.
type DisplayOverrideItem = NonNullable<
  ManifestOptions["display_override"]
>[number];
const _overrideOk: DisplayOverrideItem = "fullscreen";
void _overrideOk;
// @ts-expect-error — valor arbitrário deve ser rejeitado.
const _overrideBad: DisplayOverrideItem = "immersive";
void _overrideBad;

// Todo ícone possui src/sizes/type/purpose com tipos válidos.
type IconEntry = (typeof NEXO_PWA_MANIFEST.icons)[number];
type IconPurposeShape = IconEntry["purpose"];
const _purposeAny: IconPurposeShape = "any";
const _purposeMask: IconPurposeShape = "maskable";
void _purposeAny;
void _purposeMask;

for (const icon of NEXO_PWA_MANIFEST.icons) {
  const _src: string = icon.src;
  const _sizes: string = icon.sizes;
  const _type: string = icon.type;
  const _purpose: string = icon.purpose;
  void _src;
  void _sizes;
  void _type;
  void _purpose;
}

// Nome do tipo público segue estável.
const _manifestNamed: NexoPwaManifest = NEXO_PWA_MANIFEST;
const _workboxNamed: NexoPwaWorkbox = NEXO_PWA_WORKBOX;
void _manifestNamed;
void _workboxNamed;

// O componente PwaUpdatePrompt tipa suas exportações sem `any`.
import { PwaUpdatePrompt } from "../src/components/pwa/PwaUpdatePrompt";
const _comp: () => JSX.Element = PwaUpdatePrompt;
void _comp;
