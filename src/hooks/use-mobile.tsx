import * as React from "react";

/**
 * Breakpoints usados pela shell interna do app.
 * - MOBILE_BREAKPOINT: abaixo dele, ativa a barra de navegação inferior.
 * - SIDEBAR_MOBILE_BREAKPOINT: abaixo dele, a sidebar vira Sheet (mobile+tablet).
 */
const MOBILE_BREAKPOINT = 640;
const SIDEBAR_MOBILE_BREAKPOINT = 1024;

function useMediaBelow(breakpoint: number) {
  const [below, setBelow] = React.useState<boolean | undefined>(undefined);
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setBelow(window.innerWidth < breakpoint);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);
  return !!below;
}

/** Usado pela shadcn Sidebar: <1024 => Sheet (mobile+tablet). */
export function useIsMobile() {
  return useMediaBelow(SIDEBAR_MOBILE_BREAKPOINT);
}

/** Verdadeiro só no celular (<640). Usado pela BottomNav. */
export function useIsPhone() {
  return useMediaBelow(MOBILE_BREAKPOINT);
}
