"use client";

import * as React from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (value: Theme | ((prev: Theme) => Theme)) => void;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  themes: Theme[];
};

const STORAGE_KEY = "theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";
const THEMES: Theme[] = ["light", "dark", "system"];

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function readSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function applyResolvedTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => readStoredTheme());
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() =>
    readSystemTheme(),
  );

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? systemTheme : theme;

  React.useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  React.useEffect(() => {
    const mql = window.matchMedia(MEDIA_QUERY);
    const onChange = () => setSystemTheme(mql.matches ? "dark" : "light");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = isTheme(event.newValue) ? event.newValue : "system";
      setThemeState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = React.useCallback(
    (value: Theme | ((prev: Theme) => Theme)) => {
      setThemeState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // localStorage no disponible — el tema sigue funcionando en memoria
        }
        return next;
      });
    },
    [],
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
      themes: THEMES,
    }),
    [theme, setTheme, resolvedTheme, systemTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * useTheme — API drop-in compatible con next-themes.
 *
 * Devuelve un fallback seguro si se llama fuera del ThemeProvider para no
 * romper componentes que se renderizan en SSR antes de montar el provider.
 */
export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    theme: "system",
    setTheme: () => {},
    resolvedTheme: "light",
    systemTheme: "light",
    themes: THEMES,
  };
}
