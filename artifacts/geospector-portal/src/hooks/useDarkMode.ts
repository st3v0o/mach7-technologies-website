import { useState, useEffect, createContext, useContext } from "react";

export interface DarkModeContext {
  isDark: boolean;
  toggle: () => void;
}

export const DarkModeCtx = createContext<DarkModeContext>({ isDark: false, toggle: () => {} });

export function useDarkModeInit(): DarkModeContext {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem("gsp-dark");
      if (stored !== null) return stored === "true";
    } catch {}
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("gsp-dark", String(isDark));
    } catch {}
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((d) => !d) };
}

export function useDarkMode(): DarkModeContext {
  return useContext(DarkModeCtx);
}
