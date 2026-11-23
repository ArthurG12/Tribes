"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "tribes-theme";
const THEME_CHANGE_EVENT = "tribes-theme-change";

const ThemeContext = createContext<(() => void) | null>(null);

function getDarkModeSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function subscribeToTheme(listener: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, listener);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, listener);
}

function notifyThemeChange() {
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let isDark = false;
    try {
      isDark = window.localStorage.getItem(THEME_STORAGE_KEY) === "dark";
    } catch {
      // Sem preferência salva, o tema padrão é claro.
    }
    document.documentElement.classList.toggle("dark", isDark);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      const nextDarkMode = event.newValue === "dark";
      document.documentElement.classList.toggle("dark", nextDarkMode);
      notifyThemeChange();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function toggleTheme() {
    const nextDarkMode = !getDarkModeSnapshot();
    document.documentElement.classList.toggle("dark", nextDarkMode);
    notifyThemeChange();
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextDarkMode ? "dark" : "light");
    } catch {
      // O tema continua alternável mesmo se o armazenamento estiver indisponível.
    }
  }

  return (
    <ThemeContext.Provider value={toggleTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const toggleTheme = useContext(ThemeContext);
  if (!toggleTheme) throw new Error("useTheme deve ser usado dentro de ThemeProvider.");
  const darkMode = useSyncExternalStore(subscribeToTheme, getDarkModeSnapshot, () => false);
  return { darkMode, toggleTheme };
}
