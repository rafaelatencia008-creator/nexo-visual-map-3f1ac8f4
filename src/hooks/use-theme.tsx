import * as React from "react";

type Theme = "light" | "dark";

type ThemeCtx = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = React.createContext<ThemeCtx | null>(null);

const STORAGE_KEY = "nexo:theme";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Estado inicial "light" para SSR; leitura real do localStorage acontece em useEffect
  // (evita crash de SSR e hidratação mismatch conforme diretrizes TanStack Start).
  const [theme, setThemeState] = React.useState<Theme>("light");
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial: Theme = stored ?? (prefersDark ? "dark" : "light");
      setThemeState(initial);
      applyTheme(initial);
    } catch {
      applyTheme("light");
    }
    setHydrated(true);
  }, []);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // silencioso: cookies/localStorage podem estar bloqueados
    }
  }, []);

  const toggle = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = React.useMemo(
    () => ({ theme, toggle, setTheme }),
    [theme, toggle, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <span data-theme-hydrated={hydrated ? "true" : "false"} hidden />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    // Fallback seguro fora do provider (não deveria acontecer em produção).
    return {
      theme: "light" as Theme,
      toggle: () => {},
      setTheme: () => {},
    };
  }
  return ctx;
}
